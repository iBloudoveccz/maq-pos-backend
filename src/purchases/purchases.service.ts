import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FilterPurchaseDto, CreateSupplierDto } from './dto/filter-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  // ─── PROVEEDORES ──────────────────────────────────────────────────────────

  async findAllSuppliers(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { ruc:   { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchases: true } } },
    });
  }

  async createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async updateSupplier(id: string, dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  // ─── COMPRAS ──────────────────────────────────────────────────────────────

  async findAll(filters: FilterPurchaseDto) {
    const { supplierId, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;

    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNumber:  { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier:    { select: { id: true, name: true } },
          receivedBy:  { select: { id: true, name: true } },
          _count:      { select: { items: true } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier:   true,
        receivedBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });
    if (!purchase) throw new NotFoundException(`Compra ${id} no encontrada`);
    return purchase;
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    // Verificar proveedor
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException(`Proveedor ${dto.supplierId} no encontrado`);

    // Verificar productos
    const productIds = dto.items.map((i) => i.productId);
    const products   = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no existen');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Preparar ítems y calcular totales
    const itemsData = dto.items.map((item) => {
      const product  = productMap.get(item.productId)!;
      const subtotal = item.unitCost * item.quantity;
      return {
        productId:   item.productId,
        productName: product.name,
        quantity:    item.quantity,
        unitCost:    item.unitCost,
        subtotal,
        salePrice:   item.salePrice,
      };
    });

    const subtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0);
    const tax      = dto.tax ?? 0;
    const total    = subtotal + tax;

    const purchaseNumber = await this.generatePurchaseNumber();

    // Transacción: crear compra + actualizar stock + registrar movimientos
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la compra
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId:    dto.supplierId,
          invoiceNumber: dto.invoiceNumber,
          subtotal,
          tax,
          total,
          notes:         dto.notes,
          receivedById:  userId,
          items: { create: itemsData },
        },
        include: {
          supplier: { select: { name: true } },
          items:    true,
        },
      });

      // 2. Por cada ítem: actualizar stock y registrar movimiento
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;

        // Actualizar o crear stock
        const existingStock = await tx.stock.findFirst({
          where: { productId: item.productId },
        });

        const stockBefore = existingStock?.quantity ?? 0;
        const stockAfter  = stockBefore + item.quantity;

        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data:  { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.stock.create({
            data: { productId: item.productId, quantity: item.quantity },
          });
        }

        // Registrar movimiento de inventario
        await tx.stockMovement.create({
          data: {
            productId:    item.productId,
            quantity:     item.quantity,
            movementType: 'PURCHASE',
            notes:        `Compra ${purchaseNumber} - ${supplier.name}`,
            userId,
            stockBefore,
            stockAfter,
          },
        });

        // Actualizar costo promedio del producto
        await tx.product.update({
          where: { id: item.productId },
          data:  {
            costPrice: item.unitCost,
            // Si se envió salePrice actualizar también el precio de venta
            ...(item.salePrice && { salePrice: item.salePrice }),
          },
        });
      }

      return purchase;
    });
  }

  // ─── RESUMEN ──────────────────────────────────────────────────────────────

  async getSummary() {
    const now     = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthTotal, supplierCount, topSuppliers] = await Promise.all([
      this.prisma.purchase.aggregate({
        where:  { createdAt: { gte: firstDay } },
        _sum:   { total: true },
        _count: { id: true },
      }),
      this.prisma.supplier.count(),
      this.prisma.purchase.groupBy({
        by:      ['supplierId'],
        _sum:    { total: true },
        _count:  { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take:    5,
      }),
    ]);

    // Enriquecer top proveedores con nombre
    const supplierIds = topSuppliers.map((s) => s.supplierId);
    const suppliers   = await this.prisma.supplier.findMany({
      where:  { id: { in: supplierIds } },
      select: { id: true, name: true },
    });
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

    return {
      thisMonth: {
        totalSpent:   monthTotal._sum.total  ?? 0,
        totalOrders:  monthTotal._count.id   ?? 0,
      },
      totalSuppliers: supplierCount,
      topSuppliers: topSuppliers.map((s) => ({
        supplierId:   s.supplierId,
        supplierName: supplierMap.get(s.supplierId) ?? 'Desconocido',
        totalSpent:   s._sum.total ?? 0,
        totalOrders:  s._count.id,
      })),
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private async generatePurchaseNumber(): Promise<string> {
    const count = await this.prisma.purchase.count();
    const seq   = String(count + 1).padStart(6, '0');
    const date  = new Date();
    const yy    = String(date.getFullYear()).slice(2);
    const mm    = String(date.getMonth() + 1).padStart(2, '0');
    return `PH-${yy}${mm}-${seq}`;  // ej: PH-2604-000001
  }
}
