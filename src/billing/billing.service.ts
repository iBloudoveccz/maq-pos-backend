import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import axios from 'axios';

interface InvoiceTotals {
  subtotal: number;     // base imponible (sin IGV)
  igv: number;          // 18%
  total: number;        // total a pagar
  exonerated: number;   // monto exonerado
  free: number;         // monto gratuito
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Generar y emitir comprobante ───────────────────────────────────────────

  async createInvoice(dto: CreateInvoiceDto, userId: number) {
    // 1. Validar que el pago existe y no tiene comprobante previo
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.payment_id },
      include: { quote: { include: { customer: true } }, electronic_invoices: true },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'confirmed')
      throw new BadRequestException('Solo se pueden facturar pagos confirmados');
    if (payment.electronic_invoices.length > 0)
      throw new BadRequestException('Este pago ya tiene un comprobante emitido');

    // 2. Validar RUC para facturas
    if (dto.document_type === '01') {
      if (!dto.customer_ruc || dto.customer_ruc.length !== 11) {
        throw new BadRequestException('Factura requiere RUC válido de 11 dígitos');
      }
    }

    // 3. Obtener siguiente número de serie
    const series = dto.document_type === '01' ? 'F001' : 'B001';
    const sequence = await this.getNextSequence(series);

    // 4. Calcular totales
    const totals = this.calculateTotals(dto.items);

    // 5. Preparar datos del emisor (del .env)
    const issuer = {
      ruc: this.config.get('SUNAT_RUC'),
      name: this.config.get('COMPANY_NAME'),
      address: this.config.get('COMPANY_ADDRESS'),
      ubigeo: this.config.get('COMPANY_UBIGEO', '220101'), // Tarapoto
    };

    // 6. Crear comprobante en BD (estado: pending)
    const invoice = await this.prisma.electronicInvoice.create({
      data: {
        payment_id: dto.payment_id,
        document_type: dto.document_type,
        series,
        number: sequence,
        full_number: `${series}-${String(sequence).padStart(8, '0')}`,
        customer_ruc: dto.customer_ruc || null,
        customer_dni: dto.customer_dni || null,
        customer_name: dto.customer_name || payment.quote?.customer?.name || 'Cliente varios',
        customer_address: dto.customer_address || null,
        customer_email: dto.customer_email || null,
        subtotal: totals.subtotal,
        igv: totals.igv,
        total: totals.total,
        status: 'pending',
        items_json: JSON.stringify(dto.items),
        notes: dto.notes || null,
        created_by: userId,
        issue_date: new Date(),
      },
    });

    // 7. Enviar a SUNAT vía OSE (Nubefact)
    try {
      const oseResponse = await this.sendToOse(invoice, dto, issuer, totals);

      // 8. Actualizar con respuesta de SUNAT
      const updated = await this.prisma.electronicInvoice.update({
        where: { id: invoice.id },
        data: {
          status: oseResponse.accepted ? 'accepted' : 'rejected',
          sunat_code: oseResponse.sunat_code,
          sunat_description: oseResponse.description,
          cdr_content: oseResponse.cdr,
          hash: oseResponse.hash,
          pdf_url: oseResponse.pdf_url,
          xml_url: oseResponse.xml_url,
        },
      });

      this.logger.log(
        `Comprobante ${updated.full_number} emitido — SUNAT: ${oseResponse.sunat_code}`,
      );

      return {
        success: true,
        invoice: updated,
        sunat_accepted: oseResponse.accepted,
        message: oseResponse.description,
      };
    } catch (error) {
      // Si falla el OSE, guardar error pero no perder el registro
      await this.prisma.electronicInvoice.update({
        where: { id: invoice.id },
        data: { status: 'error', sunat_description: error.message },
      });

      this.logger.error(`Error OSE para ${invoice.full_number}: ${error.message}`);
      throw new InternalServerErrorException(
        `El comprobante fue registrado (${invoice.full_number}) pero falló el envío a SUNAT: ${error.message}`,
      );
    }
  }

  // ─── Anular comprobante ──────────────────────────────────────────────────────

  async voidInvoice(invoiceId: number, reason: string, userId: number) {
    const invoice = await this.prisma.electronicInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    if (invoice.status === 'voided') throw new BadRequestException('El comprobante ya fue anulado');
    if (invoice.status !== 'accepted')
      throw new BadRequestException('Solo se pueden anular comprobantes aceptados por SUNAT');

    // Verificar que no hayan pasado más de 7 días (SUNAT permite 7 días hábiles)
    const daysDiff = Math.floor(
      (Date.now() - invoice.issue_date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff > 7) {
      throw new BadRequestException(
        'No se puede anular: han pasado más de 7 días desde la emisión',
      );
    }

    // Enviar comunicación de baja a SUNAT vía OSE
    try {
      const voidResponse = await this.sendVoidToOse(invoice, reason);

      const updated = await this.prisma.electronicInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'voided',
          void_reason: reason,
          void_date: new Date(),
          void_ticket: voidResponse.ticket,
          voided_by: userId,
        },
      });

      this.logger.log(`Comprobante ${invoice.full_number} anulado — Ticket: ${voidResponse.ticket}`);
      return { success: true, invoice: updated, ticket: voidResponse.ticket };
    } catch (error) {
      throw new InternalServerErrorException(`Error al anular: ${error.message}`);
    }
  }

  // ─── Consultas ───────────────────────────────────────────────────────────────

  async findAll(filters: {
    status?: string;
    document_type?: string;
    date_from?: Date;
    date_to?: Date;
    page: number;
    limit: number;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.document_type) where.document_type = filters.document_type;
    if (filters.date_from || filters.date_to) {
      where.issue_date = {};
      if (filters.date_from) where.issue_date.gte = filters.date_from;
      if (filters.date_to) where.issue_date.lte = filters.date_to;
    }

    const [data, total] = await Promise.all([
      this.prisma.electronicInvoice.findMany({
        where,
        orderBy: { issue_date: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: { payment: { select: { id: true, amount: true } } },
      }),
      this.prisma.electronicInvoice.count({ where }),
    ]);

    return { data, total, page: filters.page, limit: filters.limit };
  }

  async findOne(id: number) {
    const invoice = await this.prisma.electronicInvoice.findUnique({
      where: { id },
      include: {
        payment: {
          include: { quote: { include: { customer: true } } },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    return invoice;
  }

  async getSummary(dateFrom?: Date, dateTo?: Date) {
    const where: any = { status: 'accepted' };
    if (dateFrom || dateTo) {
      where.issue_date = {};
      if (dateFrom) where.issue_date.gte = dateFrom;
      if (dateTo) where.issue_date.lte = dateTo;
    }

    const [facturas, boletas, totals] = await Promise.all([
      this.prisma.electronicInvoice.count({
        where: { ...where, document_type: '01' },
      }),
      this.prisma.electronicInvoice.count({
        where: { ...where, document_type: '03' },
      }),
      this.prisma.electronicInvoice.aggregate({
        where,
        _sum: { subtotal: true, igv: true, total: true },
        _count: { id: true },
      }),
    ]);

    return {
      facturas,
      boletas,
      total_comprobantes: totals._count.id,
      subtotal: totals._sum.subtotal || 0,
      igv: totals._sum.igv || 0,
      total: totals._sum.total || 0,
    };
  }

  // ─── Helpers internos ────────────────────────────────────────────────────────

  private async getNextSequence(series: string): Promise<number> {
    // Incremento atómico para evitar duplicados bajo concurrencia
    const seq = await this.prisma.invoiceSequence.upsert({
      where: { series },
      create: { series, last_number: 1 },
      update: { last_number: { increment: 1 } },
    });
    return seq.last_number;
  }

  private calculateTotals(items: CreateInvoiceDto['items']): InvoiceTotals {
    let subtotal = 0;
    let igv = 0;

    for (const item of items) {
      const taxRate = item.tax_rate ?? 0.18;
      const lineTotal = item.quantity * item.unit_price;
      subtotal += lineTotal;
      igv += lineTotal * taxRate;
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      igv: Math.round(igv * 100) / 100,
      total: Math.round((subtotal + igv) * 100) / 100,
      exonerated: 0,
      free: 0,
    };
  }

  /**
   * Envía el comprobante al OSE (Nubefact API).
   * Nubefact es el OSE más popular en Perú — acepta JSON directamente
   * sin necesidad de generar XML manualmente.
   * Documentación: https://www.nubefact.com/api/
   */
  private async sendToOse(
    invoice: any,
    dto: CreateInvoiceDto,
    issuer: any,
    totals: InvoiceTotals,
  ) {
    const oseUrl = this.config.get('OSE_API_URL'); // https://api.nubefact.com/api/v1
    const oseToken = this.config.get('OSE_API_TOKEN');

    const payload = {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: dto.document_type === '01' ? 1 : 3,
      serie: invoice.series,
      numero: invoice.number,
      sunat_transaction: 1,
      cliente_tipo_de_documento: dto.document_type === '01' ? 6 : (dto.customer_dni ? 1 : 0),
      cliente_numero_de_documento: dto.customer_ruc || dto.customer_dni || '',
      cliente_denominacion: invoice.customer_name,
      cliente_direccion: invoice.customer_address || '',
      cliente_email: invoice.customer_email || '',
      fecha_de_emision: new Date().toISOString().split('T')[0],
      moneda: 1, // 1 = Soles
      tipo_de_cambio: '',
      porcentaje_de_igv: 18.00,
      total_gravada: totals.subtotal,
      total_igv: totals.igv,
      total: totals.total,
      enviar_automaticamente_a_la_sunat: true,
      enviar_automaticamente_al_cliente: !!invoice.customer_email,
      codigo_del_producto_de_la_guia: '',
      formato_de_pdf: '',
      items: dto.items.map((item, idx) => ({
        unidad_de_medida: item.unit_code || 'NIU',
        codigo: String(idx + 1).padStart(4, '0'),
        descripcion: item.description,
        cantidad: item.quantity,
        valor_unitario: item.unit_price,
        precio_unitario: item.unit_price * 1.18,
        descuento: '',
        subtotal: item.quantity * item.unit_price,
        tipo_de_igv: 1, // gravada
        igv: item.quantity * item.unit_price * (item.tax_rate ?? 0.18),
        total: item.quantity * item.unit_price * (1 + (item.tax_rate ?? 0.18)),
        anticipo_regularizacion: false,
        anticipo_documento_serie: '',
        anticipo_documento_numero: '',
      })),
    };

    const response = await axios.post(
      `${oseUrl}/${issuer.ruc}/comprobantes`,
      payload,
      {
        headers: {
          Authorization: `Token token="${oseToken}"`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const data = response.data;
    return {
      accepted: data.aceptada_por_sunat,
      sunat_code: String(data.codigo_sunat || ''),
      description: data.sunat_description || data.errors?.[0] || 'OK',
      cdr: data.cdr || null,
      hash: data.hash_cpe || null,
      pdf_url: data.enlace_del_pdf || null,
      xml_url: data.enlace_del_xml || null,
    };
  }

  /**
   * Envía comunicación de baja (anulación) al OSE
   */
  private async sendVoidToOse(invoice: any, reason: string) {
    const oseUrl = this.config.get('OSE_API_URL');
    const oseToken = this.config.get('OSE_API_TOKEN');
    const ruc = this.config.get('SUNAT_RUC');

    const today = new Date().toISOString().split('T')[0];
    const voidSeries = `RA-${today.replace(/-/g, '')}-1`;

    const payload = {
      operacion: 'generar_anulacion',
      tipo_de_comprobante: invoice.document_type === '01' ? 1 : 3,
      serie: invoice.series,
      numero: invoice.number,
      fecha_de_emision: invoice.issue_date.toISOString().split('T')[0],
      motivo: reason,
    };

    const response = await axios.post(
      `${oseUrl}/${ruc}/anulaciones`,
      payload,
      {
        headers: {
          Authorization: `Token token="${oseToken}"`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    return {
      ticket: response.data.nro_ticket || response.data.ticket || 'N/A',
    };
  }
}
