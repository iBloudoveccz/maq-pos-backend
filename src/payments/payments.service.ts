import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ─── MÉTODOS DE PAGO ──────────────────────────────────────────────────────

  async getPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where:   { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── REGISTRAR PAGO ───────────────────────────────────────────────────────

  async create(dto: CreatePaymentDto, userId: string) {
    // Verificar que la cotización existe
    const quote = await this.prisma.quote.findUnique({
      where:   { id: dto.quoteId },
      include: { payments: true },
    });

    if (!quote) throw new NotFoundException(`Cotización ${dto.quoteId} no encontrada`);

    // Solo se puede pagar si está APPROVED
    if (quote.status !== 'APPROVED') {
      throw new BadRequestException(
        `La cotización debe estar en estado APPROVED para registrar un pago. Estado actual: ${quote.status}`
      );
    }

    // Verificar método de pago
    const method = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
    });
    if (!method || !method.isActive) {
      throw new NotFoundException(`Método de pago no encontrado o inactivo`);
    }

    // Calcular total ya pagado
    const totalPaid = quote.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = quote.total - totalPaid;

    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException(
        `El monto pagado (S/. ${dto.amount}) supera el saldo pendiente (S/. ${remaining.toFixed(2)})`
      );
    }

    const newTotalPaid = totalPaid + dto.amount;
    const isFullyPaid  = newTotalPaid >= quote.total - 0.01;

    // Transacción: registrar pago + cambiar estado si ya está pagado completo
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          quoteId:         dto.quoteId,
          paymentMethodId: dto.paymentMethodId,
          amount:          dto.amount,
          reference:       dto.reference,
          notes:           dto.notes,
          registeredById:  userId,
        },
        include: {
          paymentMethod:  { select: { name: true } },
          registeredBy:   { select: { name: true } },
        },
      });

      // Si ya pagó todo → pasar cotización a PAID
      if (isFullyPaid) {
        await tx.quote.update({
          where: { id: dto.quoteId },
          data:  { status: 'PAID' },
        });
      }

      return {
        payment,
        quoteStatus:   isFullyPaid ? 'PAID' : 'APPROVED',
        totalPaid:     parseFloat(newTotalPaid.toFixed(2)),
        totalPending:  parseFloat((quote.total - newTotalPaid).toFixed(2)),
        isFullyPaid,
      };
    });
  }

  // ─── HISTORIAL DE PAGOS ───────────────────────────────────────────────────

  async findAll(filters: FilterPaymentDto) {
    const { quoteId, paymentMethodId, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (quoteId)         where.quoteId         = quoteId;
    if (paymentMethodId) where.paymentMethodId = paymentMethodId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          paymentMethod: { select: { name: true, code: true } },
          registeredBy:  { select: { name: true } },
          quote: {
            select: {
              quoteNumber: true,
              total: true,
              customer: { select: { name: true, phone: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── RESUMEN DE PAGOS ─────────────────────────────────────────────────────

  async getSummary(dateFrom?: string, dateTo?: string) {
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    } else {
      // Por defecto: hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.createdAt = { gte: today };
    }

    // Total por método de pago
    const byMethod = await this.prisma.payment.groupBy({
      by:    ['paymentMethodId'],
      where,
      _sum:  { amount: true },
      _count: { id: true },
    });

    // Enriquecer con nombre del método
    const methods = await this.prisma.paymentMethod.findMany({
      where: { id: { in: byMethod.map((b) => b.paymentMethodId) } },
      select: { id: true, name: true, code: true },
    });
    const methodMap = new Map(methods.map((m) => [m.id, m]));

    const byMethodEnriched = byMethod.map((b) => ({
      method:       methodMap.get(b.paymentMethodId),
      totalAmount:  b._sum.amount ?? 0,
      transactions: b._count.id,
    }));

    // Total general
    const totals = await this.prisma.payment.aggregate({
      where,
      _sum:   { amount: true },
      _count: { id: true },
    });

    return {
      totalCollected:  totals._sum.amount  ?? 0,
      totalTransactions: totals._count.id  ?? 0,
      byMethod: byMethodEnriched,
    };
  }

  // ─── PAGOS DE UNA COTIZACIÓN ──────────────────────────────────────────────

  async findByQuote(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where:   { id: quoteId },
      select:  { id: true, quoteNumber: true, total: true, status: true },
    });
    if (!quote) throw new NotFoundException(`Cotización ${quoteId} no encontrada`);

    const payments = await this.prisma.payment.findMany({
      where:   { quoteId },
      orderBy: { createdAt: 'asc' },
      include: {
        paymentMethod: { select: { name: true, code: true } },
        registeredBy:  { select: { name: true } },
      },
    });

    const totalPaid    = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = quote.total - totalPaid;

    return {
      quote,
      payments,
      totalPaid:    parseFloat(totalPaid.toFixed(2)),
      totalPending: parseFloat(totalPending.toFixed(2)),
      isFullyPaid:  totalPending <= 0.01,
    };
  }
}
