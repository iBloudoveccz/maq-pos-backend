import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * POST /billing/invoices
   * Emitir comprobante electrónico (boleta o factura).
   * Roles: admin, billing, seller (el seller puede facturar sus propias ventas)
   */
  @Post('invoices')
  @Roles('admin', 'billing', 'seller')
  createInvoice(@Body() dto: CreateInvoiceDto, @Request() req) {
    return this.billingService.createInvoice(dto, req.user.id);
  }

  /**
   * GET /billing/invoices
   * Listado de comprobantes con filtros.
   * Query: status, document_type (01=factura|03=boleta), date_from, date_to, page, limit
   */
  @Get('invoices')
  @Roles('admin', 'billing')
  findAll(
    @Query('status') status?: string,
    @Query('document_type') documentType?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.billingService.findAll({
      status,
      document_type: documentType,
      date_from: dateFrom ? new Date(dateFrom) : undefined,
      date_to: dateTo ? new Date(dateTo) : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  /**
   * GET /billing/invoices/summary
   * Resumen del día/período: total facturado, IGV, nro de boletas y facturas.
   * Útil para el dashboard contable.
   */
  @Get('invoices/summary')
  @Roles('admin', 'billing')
  getSummary(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.billingService.getSummary(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  /**
   * GET /billing/invoices/:id
   * Detalle de un comprobante con datos del pago asociado
   */
  @Get('invoices/:id')
  @Roles('admin', 'billing', 'seller')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.findOne(id);
  }

  /**
   * POST /billing/invoices/:id/void
   * Anular comprobante (comunicación de baja a SUNAT).
   * Solo disponible dentro de los 7 días hábiles de la emisión.
   * Solo admin y billing pueden anular.
   */
  @Post('invoices/:id/void')
  @Roles('admin', 'billing')
  @HttpCode(HttpStatus.OK)
  voidInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    return this.billingService.voidInvoice(id, body.reason, req.user.id);
  }
}
