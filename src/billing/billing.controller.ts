import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoiceType, SunatStatus } from '@prisma/client';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * POST /billing/invoices/sale/:saleId
   * Emitir comprobante electrónico a partir de una venta.
   * Body: { invoiceType: 'BOLETA' | 'FACTURA' }
   */
  @Post('invoices/sale/:saleId')
  @Roles('admin', 'billing', 'seller')
  // FIX: era createInvoice(dto) → createFromSale(saleId, invoiceType)
  createFromSale(
    @Param('saleId') saleId: string,
    @Body('invoiceType') invoiceType: InvoiceType = 'BOLETA',
    @Request() req,
  ) {
    return this.billingService.createFromSale(saleId, invoiceType, req.user.id);
  }

  /**
   * GET /billing/invoices
   * Listado con filtros: invoiceType, sunatStatus, page, limit
   */
  @Get('invoices')
  @Roles('admin', 'billing')
  findAll(
    @Query('invoiceType')  invoiceType?: InvoiceType,
    @Query('sunatStatus')  sunatStatus?: SunatStatus,
    @Query('page')         page  = '1',
    @Query('limit')        limit = '20',
  ) {
    // FIX: parámetros ahora coinciden con BillingService.findAll()
    return this.billingService.findAll({
      invoiceType,
      sunatStatus,
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  }

  /**
   * GET /billing/invoices/summary
   * Resumen del período: total facturado, IGV, cantidad de comprobantes.
   */
  @Get('invoices/summary')
  @Roles('admin', 'billing')
  getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?: string,
  ) {
    // FIX: getSummary ahora requiere Date, no string | undefined → manejar undefined
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(1)); // primer día del mes
    const to   = dateTo   ? new Date(dateTo)   : new Date();
    return this.billingService.getSummary(from, to);
  }

  /**
   * GET /billing/invoices/:id
   * Detalle de un comprobante.
   * FIX: id ahora es string (UUID), no number
   */
  @Get('invoices/:id')
  @Roles('admin', 'billing', 'seller')
  findOne(@Param('id') id: string) {
    // FIX: era ParseIntPipe → id es UUID string
    return this.billingService.findOne(id);
  }

  /**
   * GET /billing/invoices/number/:number
   * Buscar por número de comprobante: B001-00000001
   */
  @Get('invoices/number/:number')
  @Roles('admin', 'billing', 'seller')
  findByNumber(@Param('number') invoiceNumber: string) {
    return this.billingService.findByNumber(invoiceNumber);
  }

  /**
   * POST /billing/invoices/:id/accept
   * Marcar comprobante como aceptado por SUNAT.
   */
  @Post('invoices/:id/accept')
  @Roles('admin', 'billing')
  @HttpCode(HttpStatus.OK)
  markAccepted(
    @Param('id') id: string,
    @Body('hashCode')   hashCode?: string,
    @Body('xmlFileUrl') xmlFileUrl?: string,
  ) {
    return this.billingService.markAccepted(id, hashCode, xmlFileUrl);
  }

  /**
   * POST /billing/invoices/:id/reject
   * Marcar comprobante como rechazado por SUNAT.
   * FIX: era voidInvoice → markRejected (el schema no tiene anulación, solo rechazo)
   */
  @Post('invoices/:id/reject')
  @Roles('admin', 'billing')
  @HttpCode(HttpStatus.OK)
  markRejected(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.billingService.markRejected(id, reason);
  }
}
