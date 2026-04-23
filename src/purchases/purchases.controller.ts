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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FilterPurchaseDto, CreateSupplierDto } from './dto/filter-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  // ─── PROVEEDORES ──────────────────────────────────────────────────────────

  /**
   * GET /api/v1/purchases/suppliers
   * ?search=distribuidora
   */
  @Get('suppliers')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Listar proveedores (admin, warehouse)' })
  @ApiQuery({ name: 'search', required: false })
  findAllSuppliers(@Query('search') search?: string) {
    return this.purchasesService.findAllSuppliers(search);
  }

  /**
   * POST /api/v1/purchases/suppliers
   */
  @Post('suppliers')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Crear proveedor (admin, warehouse)' })
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.purchasesService.createSupplier(dto);
  }

  /**
   * PATCH /api/v1/purchases/suppliers/:id
   */
  @Patch('suppliers/:id')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Actualizar proveedor (admin, warehouse)' })
  updateSupplier(@Param('id') id: string, @Body() dto: CreateSupplierDto) {
    return this.purchasesService.updateSupplier(id, dto);
  }

  // ─── COMPRAS ──────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/purchases/summary
   * Resumen del mes: total gastado, top proveedores
   */
  @Get('summary')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Resumen de compras del mes (admin, warehouse)' })
  getSummary() {
    return this.purchasesService.getSummary();
  }

  /**
   * GET /api/v1/purchases
   * Historial de compras con filtros
   */
  @Get()
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Listar compras con filtros (admin, warehouse)' })
  findAll(@Query() filters: FilterPurchaseDto) {
    return this.purchasesService.findAll(filters);
  }

  /**
   * GET /api/v1/purchases/:id
   * Detalle de una compra con todos sus ítems
   */
  @Get(':id')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Ver detalle de compra (admin, warehouse)' })
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  /**
   * POST /api/v1/purchases
   * Registrar compra — actualiza stock y costo promedio automáticamente
   */
  @Post()
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Registrar compra — actualiza stock automáticamente (admin, warehouse)' })
  create(
    @Body() dto: CreatePurchaseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchasesService.create(dto, userId);
  }
}
