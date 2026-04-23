import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto, FilterQuoteDto } from './dto/update-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  /**
   * GET /api/v1/quotes/summary
   * Resumen por estado y ventas últimos 30 días
   */
  @Get('summary')
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Resumen de cotizaciones por estado' })
  getSummary() {
    return this.quotesService.getSummary();
  }

  /**
   * GET /api/v1/quotes
   * ?status=PENDING&customerId=xxx&search=COT-2604&page=1&limit=20
   */
  @Get()
  @Roles('admin', 'seller', 'warehouse')
  @ApiOperation({ summary: 'Listar cotizaciones con filtros' })
  findAll(@Query() filters: FilterQuoteDto) {
    return this.quotesService.findAll(filters);
  }

  /**
   * GET /api/v1/quotes/:id
   * Detalle completo: cliente, ítems, pagos y despacho
   */
  @Get(':id')
  @Roles('admin', 'seller', 'warehouse')
  @ApiOperation({ summary: 'Ver detalle de cotización' })
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  /**
   * POST /api/v1/quotes
   * Seller crea la cotización cuando llega el pedido por WhatsApp
   */
  @Post()
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Crear cotización (admin, seller)' })
  create(
    @Body() dto: CreateQuoteDto,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.quotesService.create(dto, sellerId);
  }

  /**
   * PATCH /api/v1/quotes/:id
   * Editar notas, descuento o envío — solo en estado PENDING o APPROVED
   */
  @Patch(':id')
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Editar cotización — solo PENDING o APPROVED (admin, seller)' })
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotesService.update(id, dto);
  }

  /**
   * PATCH /api/v1/quotes/:id/approve
   * Cliente aprueba la cotización → pasa a APPROVED
   */
  @Patch(':id/approve')
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Aprobar cotización — cliente aceptó (admin, seller)' })
  approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotesService.approve(id, userId);
  }

  /**
   * PATCH /api/v1/quotes/:id/cancel
   * Cancelar cotización — disponible desde PENDING o APPROVED
   */
  @Patch(':id/cancel')
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Cancelar cotización (admin, seller)' })
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotesService.cancel(id, userId);
  }
}
