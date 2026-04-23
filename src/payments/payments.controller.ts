import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * GET /api/v1/payments/methods
   * Lista los métodos de pago activos (Efectivo, Yape, Plin, etc.)
   */
  @Get('methods')
  @ApiOperation({ summary: 'Listar métodos de pago activos' })
  getPaymentMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  /**
   * GET /api/v1/payments/summary
   * Recaudación del día por método de pago
   * ?dateFrom=2026-04-01&dateTo=2026-04-22
   */
  @Get('summary')
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Resumen de recaudación (por defecto: hoy)' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo',   required: false })
  getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?: string,
  ) {
    return this.paymentsService.getSummary(dateFrom, dateTo);
  }

  /**
   * GET /api/v1/payments
   * Historial de todos los pagos con filtros
   */
  @Get()
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Historial de pagos con filtros' })
  findAll(@Query() filters: FilterPaymentDto) {
    return this.paymentsService.findAll(filters);
  }

  /**
   * GET /api/v1/payments/quote/:quoteId
   * Ver pagos de una cotización específica con saldo pendiente
   */
  @Get('quote/:quoteId')
  @Roles('admin', 'seller', 'warehouse')
  @ApiOperation({ summary: 'Pagos de una cotización específica' })
  findByQuote(@Param('quoteId') quoteId: string) {
    return this.paymentsService.findByQuote(quoteId);
  }

  /**
   * POST /api/v1/payments
   * Registrar pago de una cotización APPROVED
   * Si el pago completa el total → cotización pasa a PAID automáticamente
   */
  @Post()
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Registrar pago — si completa el total pasa a PAID (admin, seller)' })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.create(dto, userId);
  }
}
