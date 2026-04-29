/**
 * MÓDULO BILLING — Facturación Electrónica SUNAT
 *
 * Reescrito para el nuevo schema:
 *   - ElectronicInvoice (saleId, series, correlative, sunatStatus...)
 *   - InvoiceSequence   (series, lastNumber)
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceType, SunatStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  /** Obtener siguiente número de comprobante y avanzar la secuencia */
  private async nextCorrelative(series: string): Promise<number> {
    const seq = await this.prisma.invoiceSequence.findUnique({
      where: { series },
    });
    if (!seq || !seq.isActive) {
      throw new BadRequestException(`Serie ${series} no encontrada o inactiva`);
    }

    // FIX: era 'last_number' → 'lastNumber'
    const updated = await this.prisma.invoiceSequence.update({
      where: { series },
      data:  { lastNumber: { increment: 1 } },
    });
    return updated.lastNumber;
  }

  /** Formatear número de comprobante: B001-00000001 */
  private formatInvoiceNumber(series: string, correlative: number): string {
    return `${series}-${String(correlative).padStart(8, '0')}`;
  }

  /** Crear comprobante electrónico a partir de una venta */
  async createFromSale(saleId: string, invoiceType: InvoiceType, createdById?: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true, payments: true },
    });
    if (!sale) throw new NotFoundException(`Venta ${saleId} no encontrada`);

    // Verificar que no tenga ya un comprobante
    const existing = await this.prisma.electronicInvoice.findUnique({
      where: { saleId },
    });
    if (existing) {
      throw new BadRequestException(`La venta ${saleId} ya tiene comprobante: ${existing.invoiceNumber}`);
    }

    // Determinar serie
    const series = invoiceType === 'BOLETA' ? 'B001' : 'F001';
    const correlative    = await this.nextCorrelative(series);
    const invoiceNumber  = this.formatInvoiceNumber(series, correlative);

    // Leer config del negocio
    const rucConfig  = await this.prisma.systemConfig.findUnique({ where: { key: 'company_ruc' } });
    const nameConfig = await this.prisma.systemConfig.findUnique({ where: { key: 'company_name' } });

    const invoice = await this.prisma.electronicInvoice.create({
      data: {
        saleId,
        invoiceType,
        series,
        correlative,
        invoiceNumber,
        issuerRuc:       rucConfig?.value  ?? '20000000000',
        issuerName:      nameConfig?.value ?? 'Mi Empresa SAC',
        customerDocType: 'DNI',
        customerDoc:     sale.taxId         ?? '00000000',
        customerName:    'Cliente',  // TODO: obtener del customer
        subtotal:        sale.subtotal,
        taxAmount:       sale.taxAmount,
        totalAmount:     sale.totalAmount,
        invoiceDate:     new Date(),
        sunatStatus:     SunatStatus.PENDING,
        createdById,
      },
    });

    return invoice;
  }

  /** Listar comprobantes con filtros */
  async findAll(params: {
    invoiceType?: InvoiceType;
    sunatStatus?: SunatStatus;
    page?: number;
    limit?: number;
  }) {
    const { invoiceType, sunatStatus, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (invoiceType)  where.invoiceType  = invoiceType;
    if (sunatStatus)  where.sunatStatus  = sunatStatus;

    const [items, total] = await Promise.all([
      this.prisma.electronicInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        include: {
          sale: {
            select: {
              saleNumber:  true,
              totalAmount: true,
              saleTime:    true,
            },
          },
        },
      }),
      this.prisma.electronicInvoice.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Obtener comprobante por ID */
  async findOne(id: string) {
    const invoice = await this.prisma.electronicInvoice.findUnique({
      where: { id },
      include: { sale: { include: { items: true, payments: true } } },
    });
    if (!invoice) throw new NotFoundException(`Comprobante ${id} no encontrado`);
    return invoice;
  }

  /** Obtener comprobante por número (B001-00000001) */
  async findByNumber(invoiceNumber: string) {
    const invoice = await this.prisma.electronicInvoice.findUnique({
      where: { invoiceNumber },
    });
    if (!invoice) throw new NotFoundException(`Comprobante ${invoiceNumber} no encontrado`);
    return invoice;
  }

  /** Marcar como aceptado por SUNAT */
  async markAccepted(id: string, hashCode?: string, xmlFileUrl?: string) {
    return this.prisma.electronicInvoice.update({
      where: { id },
      data: {
        sunatStatus: SunatStatus.ACCEPTED,
        hashCode,
        xmlFileUrl,
      },
    });
  }

  /** Marcar como rechazado por SUNAT */
  async markRejected(id: string, sunatResponse: string) {
    return this.prisma.electronicInvoice.update({
      where: { id },
      data: {
        sunatStatus:   SunatStatus.REJECTED,
        sunatResponse,
      },
    });
  }

  /** Totales del período */
  async getSummary(dateFrom: Date, dateTo: Date) {
    const totals = await this.prisma.electronicInvoice.aggregate({
      where: {
        invoiceDate:  { gte: dateFrom, lte: dateTo },
        sunatStatus:  SunatStatus.ACCEPTED,
      },
      _count: { id: true },
      _sum:   {
        subtotal:    true,
        taxAmount:   true,  // FIX: era 'igv' → 'taxAmount'
        totalAmount: true,  // FIX: era 'total' → 'totalAmount'
      },
    });

    return {
      count:        totals._count.id ?? 0,
      subtotal:     Number(totals._sum.subtotal    ?? 0),
      taxAmount:    Number(totals._sum.taxAmount   ?? 0),
      totalAmount:  Number(totals._sum.totalAmount ?? 0),
    };
  }
}
