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
import { StockService } from './stock.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private stockService: StockService) {}

  /**
   * GET /api/v1/stock
   * ?search=  ?warehouseId=  ?lowStock=true
   */
  @Get()
  @ApiOperation({ summary: 'Listar stock de todos los productos' })
  @ApiQuery({ name: 'search',      required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'lowStock',    required: false })
  findAll(
    @Query('search')      search?:      string,
    @Query('warehouseId') warehouseId?: string,
    @Query('lowStock')    lowStock?:    string,
  ) {
    return this.stockService.findAll({
      search,
      warehouseId: warehouseId || undefined,
      lowStock:    lowStock === 'true',
    });
  }

  /**
   * GET /api/v1/stock/summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Resumen de valorización del inventario' })
  getSummary() {
    return this.stockService.getSummary();
  }

  /**
   * GET /api/v1/stock/warehouses  ← NUEVO
   * Lista almacenes disponibles para el selector del frontend
   */
  @Get('warehouses')
  @ApiOperation({ summary: 'Listar almacenes disponibles' })
  getWarehouses() {
    return this.stockService.getWarehouses();
  }

  /**
   * GET /api/v1/stock/low
   */
  @Get('low')
  @ApiOperation({ summary: 'Productos con stock bajo o en cero' })
  getLowStock() {
    return this.stockService.getLowStock();
  }

  /**
   * GET /api/v1/stock/movements
   */
  @Get('movements')
  @ApiOperation({ summary: 'Historial de movimientos de stock' })
  getMovements(@Query() filters: FilterMovementsDto) {
    return this.stockService.getMovements(filters);
  }

  /**
   * GET /api/v1/stock/:productId
   * IMPORTANTE: debe ir DESPUÉS de todas las rutas /stock/algo
   * para que NestJS no confunda "summary", "warehouses", etc. con productId
   */
  @Get(':productId')
  @ApiOperation({ summary: 'Stock de un producto específico' })
  findOne(@Param('productId') productId: string) {
    return this.stockService.findOne(productId);
  }

  /**
   * POST /api/v1/stock/adjust
   */
  @Post('adjust')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Ajuste manual de stock' })
  adjust(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.adjust(dto, userId);
  }
}
