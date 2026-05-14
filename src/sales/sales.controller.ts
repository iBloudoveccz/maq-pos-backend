// ─── sales.controller.ts ─────────────────────────────────────────────────
import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { CreateSaleDto, VoidSaleDto } from './dto/create-sale.dto';
import { SaleFiltersDto } from './dto/sale-filters.dto';

@ApiTags('Ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // GET /sales — listado con filtros
  @Get()
  @ApiOperation({ summary: 'Listar ventas con filtros' })
  findAll(@Query() filters: SaleFiltersDto) {
    return this.salesService.findAll(filters);
  }

  // GET /sales/summary?date=2026-04-21
  @Get('summary')
  @ApiOperation({ summary: 'Resumen del día (dashboard ventas)' })
  getDailySummary(@Query('date') date?: string) {
    return this.salesService.getDailySummary(date);
  }

  // GET /sales/payment-methods — modos de pago activos
  @Get('payment-methods')
  @ApiOperation({ summary: 'Modos de pago disponibles' })
  getPaymentMethods() {
    return this.salesService.getPaymentMethods();
  }

  // GET /sales/folio/:folio — buscar por número de folio
  @Get('folio/:folio')
  @ApiOperation({ summary: 'Buscar venta por folio' })
  findByFolio(@Param('folio') folio: string) {
    return this.salesService.findByFolio(folio);
  }

  // GET /sales/:id — detalle completo
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una venta' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  // POST /sales — registrar venta nueva
  @Post()
  @ApiOperation({ summary: 'Registrar nueva venta' })
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  // PATCH /sales/:id/void — anular venta
  @Patch(':id/void')
  @ApiOperation({ summary: 'Anular una venta (Sxyn=1)' })
  void(@Param('id') id: string, @Body() dto: VoidSaleDto) {
    return this.salesService.void(id, dto.reason, dto.operatorId);
  }
}

// ─── sales.module.ts ──────────────────────────────────────────────────────
// (archivo separado — copiar a src/sales/sales.module.ts)
/*
import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
*/
