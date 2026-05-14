import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CashFiltersDto } from './dto/cash-filters.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // TURNOS (L_gcinfo)
  // ══════════════════════════════════════════════════════════════════════════

  async findAllShifts(filters: CashFiltersDto) {
    const { page = 1, limit = 20, cashierId, terminalId, dateFrom, dateTo, isOpen } = filters;

    const where: Prisma.CashShiftWhereInput = {
      ...(cashierId && { cashierId }),
      ...(terminalId && { terminalId }),
      ...(isOpen !== undefined && { closeTime: isOpen ? null : { not: null } }),
      ...(dateFrom || dateTo
        ? { shiftDate: { ...(dateFrom && { gte: new Date(dateFrom) }), ...(dateTo && { lte: new Date(dateTo) }) } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.cashShift.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { openTime: 'desc' },
        include: {
          cashier: { select: { id: true, name: true } },
          terminal: { select: { id: true, name: true } },
          paymentBreakdown: {
            include: { paymentMethod: { select: { id: true, name: true, code: true } } },
          },
        },
      }),
      this.prisma.cashShift.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOneShift(id: string) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, name: true } },
        terminal: { select: { id: true, name: true } },
        paymentBreakdown: {
          include: { paymentMethod: true },
        },
        sales: {
          where: { status: 'VALID' },
          select: {
            id: true, folio: true, saleTime: true,
            taxAmount: true, status: true,
            _count: { select: { items: true } },
            payments: { select: { amountPaid: true } },
          },
          orderBy: { saleTime: 'desc' },
        },
      },
    });
    if (!shift) throw new NotFoundException(`Turno ${id} no encontrado`);
    return shift;
  }

  // ── Turno activo de un POS ─────────────────────────────────────────────────
  async getActiveShift(terminalId: string) {
    return this.prisma.cashShift.findFirst({
      where: { terminalId, closeTime: null },
      include: {
        cashier: { select: { id: true, name: true } },
        terminal: { select: { id: true, name: true } },
      },
    });
  }

  // ── Abrir turno ────────────────────────────────────────────────────────────
  async openShift(dto: OpenShiftDto) {
    // Verificar que no hay turno abierto en ese POS
    const existing = await this.getActiveShift(dto.terminalId);
    if (existing) throw new BadRequestException(`Ya existe un turno abierto en el terminal ${dto.terminalId} (ID: ${existing.id})`);

    const now = new Date();
    // Gccode: {terminalCode}_{AAMMDD}{HHMMSS} — mismo formato que S12
    const gcCode = `${dto.terminalCode}_${this.formatGcCode(now)}`;

    // Calcular número de turno del día
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.cashShift.count({
      where: { terminalId: dto.terminalId, shiftDate: { gte: today } },
    });

    return this.prisma.cashShift.create({
      data: {
        shiftNumber: todayCount + 1,
        shiftDate: now,
        cashierId: dto.cashierId,
        terminalId: dto.terminalId,
        gcCode,
        openTime: now,
        openingCash: dto.openingCash ?? 0,
        salesCount: 0,
        totalSales: 0,
        totalListPrice: 0,
        totalTax: 0,
        totalUnits: 0,
        totalReturns: 0,
        cashWithdrawals: 0,
        depositAmount: 0,
      },
      include: {
        cashier: { select: { id: true, name: true } },
        terminal: { select: { id: true, name: true } },
      },
    });
  }

  // ── Cerrar turno ───────────────────────────────────────────────────────────
  async closeShift(id: string) {
    const shift = await this.findOneShift(id);
    if (shift.closeTime) throw new BadRequestException('El turno ya está cerrado');

    // Recalcular totales desde las ventas reales del turno
    const [salesAgg, paymentAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { shiftId: id, status: 'VALID' },
        _count: { id: true },
        _sum: { taxAmount: true, freightAmount: true },
      }),
      this.prisma.salePayment.groupBy({
        by: ['paymentMethodId'],
        where: { sale: { shiftId: id, status: 'VALID' } },
        _sum: { amountPaid: true },
      }),
    ]);

    const totalSales = await this.prisma.saleItem.aggregate({
      where: { sale: { shiftId: id, status: 'VALID' } },
      _sum: { totalAmount: true, quantity: true },
    });

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Actualizar cabecera del turno
      await tx.cashShift.update({
        where: { id },
        data: {
          closeTime: now,
          salesCount: salesAgg._count.id,
          totalSales: totalSales._sum.totalAmount ?? 0,
          totalTax: salesAgg._sum.taxAmount ?? 0,
          totalUnits: totalSales._sum.quantity ?? 0,
        },
      });

      // Actualizar desglose de pagos
      for (const p of paymentAgg) {
        await tx.shiftPayment.upsert({
          where: { shiftId_paymentMethodId: { shiftId: id, paymentMethodId: p.paymentMethodId! } },
          create: {
            shiftId: id,
            paymentMethodId: p.paymentMethodId!,
            amountCollected: p._sum.amountPaid ?? 0,
            confirmedAmount: 0,
          },
          update: { amountCollected: p._sum.amountPaid ?? 0 },
        });
      }
    });

    return this.findOneShift(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIBRO DE CAJA (L_MoneyInout)
  // ══════════════════════════════════════════════════════════════════════════

  async getCashBook(filters: CashFiltersDto) {
    const { page = 1, limit = 30, dateFrom, dateTo, terminalId } = filters;

    const where: Prisma.CashBookEntryWhereInput = {
      ...(terminalId && { terminalId }),
      ...(dateFrom || dateTo
        ? { entryDate: { ...(dateFrom && { gte: new Date(dateFrom) }), ...(dateTo && { lte: new Date(dateTo) }) } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.cashBookEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
        include: { operator: { select: { id: true, name: true } } },
      }),
      this.prisma.cashBookEntry.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN EJECUTIVO (dashboard de caja)
  // ══════════════════════════════════════════════════════════════════════════

  async getDailyCashSummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const [shifts, salesByPayment] = await Promise.all([
      // Resumen por turno del día
      this.prisma.cashShift.findMany({
        where: { shiftDate: { gte: start, lte: end } },
        include: {
          cashier: { select: { id: true, name: true } },
          terminal: { select: { id: true, name: true } },
          paymentBreakdown: {
            include: { paymentMethod: { select: { name: true, code: true } } },
          },
        },
        orderBy: { openTime: 'asc' },
      }),

      // Recaudación total del día por modo de pago
      this.prisma.salePayment.groupBy({
        by: ['paymentMethodId'],
        where: { sale: { saleDate: { gte: start, lte: end }, status: 'VALID' } },
        _sum: { amountPaid: true },
        _count: { id: true },
      }),
    ]);

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { id: { in: salesByPayment.map((p) => p.paymentMethodId).filter((x): x is string => !!x) } },
      select: { id: true, name: true, code: true },
    });

    // Totales del día
    const totals = shifts.reduce(
      (acc, s) => ({
        shifts: acc.shifts + 1,
        sales: acc.sales + s.salesCount,
        total: acc.total + Number(s.totalSales),
        tax: acc.tax + Number(s.totalTax),
        units: acc.units + Number(s.totalUnits),
        returns: acc.returns + Number(s.totalReturns),
      }),
      { shifts: 0, sales: 0, total: 0, tax: 0, units: 0, returns: 0 },
    );

    return {
      date: start,
      totals,
      shifts: shifts.map((s) => ({
        id: s.id,
        shiftNumber: s.shiftNumber,
        gcCode: s.gcCode,
        cashier: s.cashier,
        terminal: s.terminal,
        openTime: s.openTime,
        closeTime: s.closeTime,
        isOpen: !s.closeTime,
        salesCount: s.salesCount,
        totalSales: s.totalSales,
        totalTax: s.totalTax,
        openingCash: s.openingCash,
        paymentBreakdown: s.paymentBreakdown,
      })),
      paymentSummary: salesByPayment.map((p) => {
        const method = paymentMethods.find((m) => m.id === p.paymentMethodId);
        return {
          methodId: p.paymentMethodId,
          name: method?.name ?? 'Desconocido',
          code: method?.code,
          total: p._sum.amountPaid ?? 0,
          count: p._count.id,
        };
      }),
    };
  }

  // ── Helper: formato GcCode ────────────────────────────────────────────────
  private formatGcCode(date: Date): string {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yy}${mm}${dd}${hh}${mi}${ss}`;
  }
}
