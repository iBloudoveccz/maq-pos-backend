import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // ─── CATEGORÍAS ───────────────────────────────────────────────────────────

  /**
   * GET /api/v1/products/categories
   * Todos pueden ver categorías
   */
  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías de productos' })
  findAllCategories() {
    return this.productsService.findAllCategories();
  }

  /**
   * POST /api/v1/products/categories
   * Solo admin y warehouse crean categorías
   */
  @Post('categories')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Crear categoría (admin, warehouse)' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto);
  }

  /**
   * PATCH /api/v1/products/categories/:id
   */
  @Patch('categories/:id')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Actualizar categoría (admin, warehouse)' })
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCategoryDto) {
    return this.productsService.updateCategory(id, dto);
  }

  // ─── PRODUCTOS ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/products
   * Todos los roles pueden listar productos
   * Filtros: ?search=crocs&categoryId=xxx&isActive=true&lowStock=true&page=1&limit=20
   */
  @Get()
  @ApiOperation({ summary: 'Listar productos con filtros y paginación' })
  findAll(@Query() filters: FilterProductDto) {
    return this.productsService.findAll(filters);
  }

  /**
   * GET /api/v1/products/barcode/:barcode
   * Buscar por código de barras — útil para el vendedor al registrar ítems
   */
  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Buscar producto por código de barras' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  /**
   * GET /api/v1/products/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de producto' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * POST /api/v1/products
   * Solo admin y warehouse crean productos
   */
  @Post()
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Crear producto (admin, warehouse)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /**
   * PATCH /api/v1/products/:id
   */
  @Patch(':id')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Actualizar producto (admin, warehouse)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  /**
   * PATCH /api/v1/products/:id/deactivate
   * Soft delete — no borra físicamente
   */
  @Patch(':id/deactivate')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Desactivar producto — soft delete (admin, warehouse)' })
  deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }

  /**
   * PATCH /api/v1/products/:id/activate
   */
  @Patch(':id/activate')
  @Roles('admin', 'warehouse')
  @ApiOperation({ summary: 'Reactivar producto (admin, warehouse)' })
  activate(@Param('id') id: string) {
    return this.productsService.activate(id);
  }
}
