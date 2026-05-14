import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleFiltersDto } from './dto/sale-filters.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // ── Listado con filtros ────────────────────────────────────────────────────
  async findAll(filters: SaleFiltersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      cashierId,
      terminalId,
      warehouseId,
      paymentMethodId,
      status,
      dateFrom,
      dateTo,
    } = filters;

    const where: Prisma.SaleWhereInput = {
      ...(status ? { status } : { status: 'VALID' }), // por defecto excluir anuladas
      ...(cashierId && { cashierId }),
      ...(terminalId && { terminalId }),
      ...(search && {
        OR: [
          { folio: { contains: search, mode: 'insensitive' } },
          { taxId: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(dateFrom || dateTo
        ? {
            saleDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(paymentMethodId && {
        payments: { some: { paymentMethodId } },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { saleTime: 'desc' },
        include: {
          cashier: { select: { id: true, name: true } },
          terminal: { select: { id: true, name: true } },
          loyaltyCard: { select: { id: true, name: true } },
          payments: {
            include: { paymentMethod: { select: { id: true, name: true, code: true } } },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: data.map((s) => ({
        id: s.id,
        folio: s.folio,
        saleDate: s.saleDate,
        saleTime: s.saleTime,
        status: s.status,
        taxAmount: s.taxAmount,
        freightAmount: s.freightAmount,
        cashier: s.cashier,
        terminal: s.terminal,
        loyaltyCard: s.loyaltyCard,
        itemCount: s._count.items,
        totalAmount: s.payments.reduce((acc, p) => acc + Number(p.amountPaid), 0),
        paymentMethods: s.payments.map((p) => p.paymentMethod?.name).filter(Boolean),
      })),
      total,
      page,
      limit,
    };
  }

  // ── Detalle completo de una venta ──────────────────────────────────────────
  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, name: true } },
        terminal: { select: { id: true, name: true } },
        loyaltyCard: { select: { id: true, name: true, tel: true } },
        shift: { select: { id: true, shiftNumber: true, gcCode: true } },
        items: {
          include: {
            product: { select: { id: true, barcode: true } },
          },
          orderBy: { id: 'asc' },
        },
        payments: {
          include: { paymentMethod: { select: { id: true, name: true, code: true } } },
        },
        electronicInvoice: true,
      },
    });

    if (!sale) throw new NotFoundException(`Venta ${id} no encontrada`);
    return sale;
  }

  // ── Buscar por folio (desde el POS) ───────────────────────────────────────
  async findByFolio(folio: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { folio },
      include: {
        items: true,
        payments: { include: { paymentMethod: true } },
      },
    });
    if (!sale) throw new NotFoundException(`Folio ${folio} no encontrado`);
    return sale;
  }

  // ── Crear venta ────────────────────────────────────────────────────────────
  async create(dto: CreateSaleDto) {
    const { items, payments, ...billData } = dto;

    // Calcular totales
    const subtotal = items.reduce((acc, i) => acc + i.quantity * i.salePrice, 0);
    const taxAmount = items.reduce((acc, i) => acc + Number(i.taxAmount ?? 0), 0);

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          folio: billData.folio,
          saleDate: new Date(billData.saleDate),
          saleTime: new Date(billData.saleTime),
          cashierId: billData.cashierId,
          terminalId: billData.terminalId,
          shiftId: billData.shiftId,
          loyaltyCardId: billData.loyaltyCardId ?? null,
          taxId: billData.taxId ?? null,
          ssid: billData.ssid ?? null,
          gcCode: billData.gcCode ?? null,
          taxAmount,
          freightAmount: billData.freightAmount ?? 0,
          status: 'VALID',
          isPublished: true,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unit: item.unit,
              quantity: item.quantity,
              salePrice: item.salePrice,
              costPrice: item.costPrice,
              totalAmount: item.quantity * item.salePrice,
              discountAmount: item.discountAmount ?? 0,
              loyaltyDiscount: item.loyaltyDiscount ?? 0,
              taxRate: item.taxRate ?? 0.18,
              taxAmount: item.taxAmount ?? 0,
              isStatistic: true,
              isPromo: false,
            })),
          },
          payments: {
            create: payments.map((p) => ({
              paymentMethodId: p.paymentMethodId,
              bankName: p.bankName ?? null,
              amountTendered: p.amountTendered,
              amountPaid: p.amountPaid,
              changeAmount: p.changeAmount ?? 0,
            })),
          },
        },
        include: { items: true, payments: true },
      });

      // Descontar stock por cada ítem
      for (const item of items) {
        if (!item.warehouseId) continue;
        await tx.stock.updateMany({
          where: { productId: item.productId, warehouseId: item.warehouseId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: item.warehouseId,
            type: 'SALE',
            quantity: -item.quantity,
            unitCost: item.costPrice,
            documentRef: billData.folio,
            notes: `Venta ${billData.folio}`,
            operatorId: billData.cashierId,
          },
        });
      }

      return sale;
    });
  }

  // ── Anular venta ───────────────────────────────────────────────────────────
  async void(id: string, reason: string, operatorId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException(`Venta ${id} no encontrada`);
    if (sale.status === 'VOID') throw new BadRequestException('La venta ya está anulada');

    return this.prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: 'VOID' },
      });

      // Revertir stock
      for (const item of sale.items) {
        if (!item.warehouseId) continue;
        await tx.stock.updateMany({
          where: { productId: item.productId, warehouseId: item.warehouseId },
          data: { quantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: item.warehouseId ?? '',
            type: 'RETURN',
            quantity: item.quantity,
            unitCost: item.costPrice,
            documentRef: sale.folio,
            notes: `Anulación: ${reason}`,
            operatorId,
          },
        });
      }

      return { success: true, folio: sale.folio };
    });
  }

  // ── Dashboard: resumen del día ─────────────────────────────────────────────
  async getDailySummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const [sales, topProducts, paymentBreakdown] = await Promise.all([
      // Resumen ventas del día
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: start, lte: end }, status: 'VALID' },
        _count: { id: true },
        _sum: { taxAmount: true },
      }),

      // Top productos del día
      this.prisma.saleItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          sale: { saleDate: { gte: start, lte: end }, status: 'VALID' },
          isStatistic: true,
        },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      }),

      // Recaudación por modo de pago
      this.prisma.salePayment.groupBy({
        by: ['paymentMethodId'],
        where: {
          sale: { saleDate: { gte: start, lte: end }, status: 'VALID' },
        },
        _sum: { amountPaid: true },
        _count: { id: true },
      }),
    ]);

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: {
        id: { in: paymentBreakdown.map((p) => p.paymentMethodId).filter((x): x is string => !!x) },
      },
      select: { id: true, name: true, code: true },
    });

    return {
      date: start,
      totalSales: sales._count.id,
      totalTax: sales._sum.taxAmount ?? 0,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: p.productName,
        quantity: p._sum.quantity ?? 0,
        total: p._sum.totalAmount ?? 0,
      })),
      paymentBreakdown: paymentBreakdown.map((p) => {
        const method = paymentMethods.find((m) => m.id === p.paymentMethodId);
        return {
          methodId: p.paymentMethodId,
          methodName: method?.name ?? 'Desconocido',
          code: method?.code,
          total: p._sum.amountPaid ?? 0,
          count: p._count.id,
        };
      }),
    };
  }

  // ── Métodos de pago disponibles ────────────────────────────────────────────
  async getPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
