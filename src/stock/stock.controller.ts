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
   * Lista stock de todos los productos activos
   * ?search=crocs
   */
  @Get()
  @ApiOperation({ summary: 'Listar stock de todos los productos' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('search') search?: string) {
    return this.stockService.findAll(search);
  }

  /**
   * GET /api/v1/stock/summary
   * Resumen general: valor total del inventario, productos con stock bajo, etc.
   */
  @Get('summary')
  @ApiOperation({ summary: 'Resumen de valorización del inventario' })
  getSummary() {
    return this.stockService.getSummary();
  }

  /**
   * GET /api/v1/stock/low
   * Productos con stock igual o menor al mínimo configurado
   */
  @Get('low')
  @ApiOperation({ summary: 'Productos con stock bajo o en cero' })
  getLowStock() {
    return this.stockService.getLowStock();
  }

  /**
   * GET /api/v1/stock/movements
   * Historial de movimientos con filtros
   */
  @Get('movements')
  @ApiOperation({ summary: 'Historial de movimientos de stock' })
  getMovements(@Query() filters: FilterMovementsDto) {
    return this.stockService.getMovements(filters);
  }

  /**
   * GET /api/v1/stock/:productId
   * Stock de un producto específico
   */
  @Get(':productId')
  @ApiOperation({ summary: 'Stock de un producto específico' })
  findOne(@Param('productId') productId: string) {
    return this.stockService.findOne(productId);
  }

  /**
   * POST /api/v1/stock/adjust
   * Ajuste manual de stock — solo admin y warehouse
   * Tipos: ADJUSTMENT, OWNUSE, RETURN, STOCKTAKING
   */
  @Post('adjust')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Ajuste manual de stock (admin, warehouse)' })
  adjust(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.adjust(dto, userId);
  }
}
