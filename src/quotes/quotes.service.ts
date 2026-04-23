import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto, FilterQuoteDto } from './dto/update-quote.dto';

// Flujo de estados permitidos
const STATUS_FLOW: Record<string, string[]> = {
  PENDING:    ['APPROVED', 'CANCELLED'],
  APPROVED:   ['PAID', 'CANCELLED'],
  PAID:       ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  [],
};

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  // ─── LISTAR ───────────────────────────────────────────────────────────────

  async findAll(filters: FilterQuoteDto) {
    const { customerId, status, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (customerId) where.customerId = customerId;
    if (status)     where.status     = status;

    if (search) {
      where.OR = [
        { quoteNumber:         { contains: search, mode: 'insensitive' } },
        { customer: { name:    { contains: search, mode: 'insensitive' } } },
        { customer: { phone:   { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [items, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer:  { select: { id: true, name: true, phone: true } },
          seller:    { select: { id: true, name: true } },
          _count:    { select: { items: true } },
        },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        customer:  true,
        seller:    { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        payments: {
          include: {
            paymentMethod: { select: { name: true } },
            registeredBy:  { select: { name: true } },
          },
        },
        shipment: true,
      },
    });

    if (!quote) throw new NotFoundException(`Cotización ${id} no encontrada`);
    return quote;
  }

  // ─── CREAR ────────────────────────────────────────────────────────────────

  async create(dto: CreateQuoteDto, sellerId: string) {
    // Verificar que el cliente existe
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException(`Cliente ${dto.customerId} no encontrado`);

    // Obtener precios de los productos
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no existen o están inactivos');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calcular ítems y totales
    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = item.unitPrice ?? product.salePrice;
      const subtotal  = unitPrice * item.quantity;

      return {
        productId:   item.productId,
        productName: product.name,   // snapshot del nombre al momento de cotizar
        quantity:    item.quantity,
        unitPrice,
        costPrice:   product.costPrice,
        subtotal,
        notes:       item.notes,
      };
    });

    const subtotal     = itemsData.reduce((sum, i) => sum + i.subtotal, 0);
    const discount     = dto.discount     ?? 0;
    const shippingCost = dto.shippingCost ?? 0;
    const total        = subtotal - discount + shippingCost;

    // Generar número de cotización
    const quoteNumber = await this.generateQuoteNumber();

    return this.prisma.quote.create({
      data: {
        quoteNumber,
        customerId:   dto.customerId,
        sellerId,
        status:       'PENDING',
        subtotal,
        discount,
        shippingCost,
        total,
        notes:        dto.notes,
        items: { create: itemsData },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        items:    true,
      },
    });
  }

  // ─── ACTUALIZAR ───────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateQuoteDto) {
    const quote = await this.findOne(id);

    if (!['PENDING', 'APPROVED'].includes(quote.status)) {
      throw new BadRequestException(
        `No se puede editar una cotización en estado ${quote.status}`
      );
    }

    // Recalcular total si cambian descuento o envío
    const discount     = dto.discount     ?? quote.discount;
    const shippingCost = dto.shippingCost ?? quote.shippingCost;
    const total        = quote.subtotal - discount + shippingCost;

    return this.prisma.quote.update({
      where: { id },
      data: { ...dto, discount, shippingCost, total },
    });
  }

  // ─── CAMBIOS DE ESTADO ────────────────────────────────────────────────────

  async changeStatus(id: string, newStatus: string, userId: string) {
    const quote = await this.findOne(id);

    const allowed = STATUS_FLOW[quote.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede pasar de ${quote.status} a ${newStatus}. Estados permitidos: ${allowed.join(', ') || 'ninguno'}`
      );
    }

    return this.prisma.quote.update({
      where: { id },
      data:  { status: newStatus },
    });
  }

  /** Aprobar cotización (cliente aceptó) */
  async approve(id: string, userId: string) {
    return this.changeStatus(id, 'APPROVED', userId);
  }

  /** Cancelar cotización */
  async cancel(id: string, userId: string) {
    return this.changeStatus(id, 'CANCELLED', userId);
  }

  // ─── RESUMEN ──────────────────────────────────────────────────────────────

  async getSummary() {
    const [byStatus, recentTotal] = await Promise.all([
      this.prisma.quote.groupBy({
        by:       ['status'],
        _count:   { id: true },
        _sum:     { total: true },
      }),
      this.prisma.quote.aggregate({
        where: {
          status:    'PAID',
          createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) },
        },
        _sum:   { total: true },
        _count: { id: true },
      }),
    ]);

    return {
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count:  s._count.id,
        total:  s._sum.total ?? 0,
      })),
      last30Days: {
        paidOrders: recentTotal._count.id,
        revenue:    recentTotal._sum.total ?? 0,
      },
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private async generateQuoteNumber(): Promise<string> {
    const count = await this.prisma.quote.count();
    const seq   = String(count + 1).padStart(6, '0');
    const date  = new Date();
    const yy    = String(date.getFullYear()).slice(2);
    const mm    = String(date.getMonth() + 1).padStart(2, '0');
    return `COT-${yy}${mm}-${seq}`;  // ej: COT-2604-000001
  }
}
