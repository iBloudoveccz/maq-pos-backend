/**
 * MÓDULO PAYMENTS — migrado a StorePayment / SalePayment
 * Stub completo que coincide con el PaymentsController existente.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // FIX: requerido por el controller (GET /payments/methods)
  async getPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where:   { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  // FIX: requerido por el controller (GET /payments/summary)
  async getSummary(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().setHours(0, 0, 0, 0));
    const to   = dateTo   ? new Date(dateTo)   : new Date();

    const payments = await this.prisma.storePayment.findMany({
      where:   { status: 'VERIFIED', createdAt: { gte: from, lte: to } },
      include: { order: { select: { totalAmount: true } } },
    });

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return { total, count: payments.length, dateFrom: from, dateTo: to };
  }

  // FIX: acepta filters como el controller espera
  async findAll(filters: any) {
    const { page = 1, limit = 20, status } = filters ?? {};
    const skip  = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.storePayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, customerName: true } } },
      }),
      this.prisma.storePayment.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  // FIX: requerido por el controller (GET /payments/quote/:quoteId)
  // quoteId ahora es orderId de StoreOrder
  async findByQuote(orderId: string) {
    return this.prisma.storePayment.findMany({
      where:   { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // FIX: requerido por el controller (POST /payments)
  async create(dto: any, userId: string) {
    // TODO: implementar registro de pago con StorePayment
    return { message: 'TODO: implementar', dto, userId };
  }
}
