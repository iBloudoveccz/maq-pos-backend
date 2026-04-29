import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    status?: string;
    courierId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters;
    const skip  = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = this.mapStatus(status);

    const [items, total] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, orderNumber: true, customerName: true, customerPhone: true,
          status: true, trackingNumber: true, shippingAddress: true,
          shippingDistrict: true, shippingCity: true, totalAmount: true, updatedAt: true,
        },
      }),
      this.prisma.storeOrder.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findByStatus(status: string) {
    return this.prisma.storeOrder.findMany({
      where:   { status: this.mapStatus(status) as any },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, orderNumber: true, customerName: true, customerPhone: true,
        status: true, trackingNumber: true, shippingAddress: true,
        shippingDistrict: true, shippingCity: true, totalAmount: true, updatedAt: true,
      },
    });
  }

  async findOne(id: number | string) {
    const order = await this.prisma.storeOrder.findFirst({
      where: { id: String(id) },
      include: { items: true, payments: true },
    });
    if (!order) throw new NotFoundException(`Pedido ${id} no encontrado`);
    return order;
  }

  async getStats(filters: { dateFrom?: Date; dateTo?: Date }) {
    const where: any = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo)   where.createdAt.lte = filters.dateTo;
    }
    const [pending, processing, shipped, delivered, cancelled] = await Promise.all([
      this.prisma.storeOrder.count({ where: { ...where, status: 'PENDING_PAYMENT' } }),
      this.prisma.storeOrder.count({ where: { ...where, status: 'PROCESSING' } }),
      this.prisma.storeOrder.count({ where: { ...where, status: 'SHIPPED' } }),
      this.prisma.storeOrder.count({ where: { ...where, status: 'DELIVERED' } }),
      this.prisma.storeOrder.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);
    return { pending, processing, shipped, delivered, cancelled };
  }

  async update(id: number, dto: any, userId: string) {
    await this.findOne(id);
    return this.prisma.storeOrder.update({
      where: { id: String(id) },
      data: {
        ...(dto.status         && { status: dto.status }),
        ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
        ...(dto.notes          && { notes: dto.notes }),
      },
    });
  }

  async dispatch(id: number, dto: {
    trackingNumber: string;
    courierId?: number;
    notes?: string;
    userId: string;
  }) {
    await this.findOne(id);
    return this.prisma.storeOrder.update({
      where: { id: String(id) },
      data: {
        status: 'SHIPPED',
        trackingNumber: dto.trackingNumber,
        ...(dto.notes && { notes: dto.notes }),
      },
    });
  }

  async markDelivered(id: number, notes?: string, userId?: string) {
    await this.findOne(id);
    return this.prisma.storeOrder.update({
      where: { id: String(id) },
      data:  { status: 'DELIVERED' },
    });
  }

  async markFailed(id: number, reason: string, userId: string) {
    await this.findOne(id);
    return this.prisma.storeOrder.update({
      where: { id: String(id) },
      data:  { status: 'CANCELLED', notes: reason },
    });
  }

  async getHistory(id: number) {
    const order = await this.findOne(id);
    return { order, history: [] };
  }

  private mapStatus(status: string): string {
    const map: Record<string, string> = {
      pending:    'PENDING_PAYMENT',
      processing: 'PROCESSING',
      shipped:    'SHIPPED',
      in_transit: 'SHIPPED',
      delivered:  'DELIVERED',
      failed:     'CANCELLED',
      cancelled:  'CANCELLED',
    };
    return map[status.toLowerCase()] ?? status.toUpperCase();
  }
}
