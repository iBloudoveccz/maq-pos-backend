/**
 * MÓDULO QUOTES — migrado a StoreOrder
 * Stub completo que coincide con el QuotesController existente.
 * TODO: implementar cada método con la lógica real de StoreOrder.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [total, pending, processing, shipped] = await Promise.all([
      this.prisma.storeOrder.count(),
      this.prisma.storeOrder.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.storeOrder.count({ where: { status: 'PROCESSING' } }),
      this.prisma.storeOrder.count({ where: { status: 'SHIPPED' } }),
    ]);
    return { total, pending, processing, shipped };
  }

  async findAll(filters: any) {
    const { page = 1, limit = 20, status } = filters ?? {};
    const skip  = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true },
      }),
      this.prisma.storeOrder.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    return this.prisma.storeOrder.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
  }

  async create(dto: any, sellerId: string) {
    // TODO: implementar con StoreOrder
    return { message: 'TODO: implementar StoreOrder', dto, sellerId };
  }

  async update(id: string, dto: any) {
    return this.prisma.storeOrder.update({
      where: { id },
      data:  { notes: dto.notes },
    });
  }

  async approve(id: string, userId: string) {
    return this.prisma.storeOrder.update({
      where: { id },
      data:  { status: 'PROCESSING' },
    });
  }

  async cancel(id: string, userId: string) {
    return this.prisma.storeOrder.update({
      where: { id },
      data:  { status: 'CANCELLED' },
    });
  }
}
