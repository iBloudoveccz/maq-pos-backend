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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto, FilterCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  /**
   * GET /api/v1/customers
   * Seller, admin y warehouse pueden ver clientes
   * ?search=carlos&page=1&limit=20
   */
  @Get()
  @Roles('admin', 'seller', 'warehouse')
  @ApiOperation({ summary: 'Listar clientes con búsqueda y paginación' })
  findAll(@Query() filters: FilterCustomerDto) {
    return this.customersService.findAll(filters);
  }

  /**
   * GET /api/v1/customers/phone/:phone
   * Buscar cliente por teléfono — útil al recibir un pedido por WhatsApp
   */
  @Get('phone/:phone')
  @Roles('admin', 'seller', 'warehouse')
  @ApiOperation({ summary: 'Buscar cliente por teléfono (útil para pedidos WhatsApp)' })
  findByPhone(@Param('phone') phone: string) {
    return this.customersService.findByPhone(phone);
  }

  /**
   * GET /api/v1/customers/:id
   */
  @Get(':id')
  @Roles('admin', 'seller', 'warehouse')
  @ApiOperation({ summary: 'Ver detalle del cliente con últimas 10 cotizaciones' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  /**
   * GET /api/v1/customers/:id/history
   * Historial completo de compras del cliente
   */
  @Get(':id/history')
  @Roles('admin', 'seller', 'warehouse')
  @ApiOperation({ summary: 'Historial completo de compras del cliente' })
  getHistory(@Param('id') id: string) {
    return this.customersService.getHistory(id);
  }

  /**
   * POST /api/v1/customers
   * Seller puede crear clientes al recibir un pedido
   */
  @Post()
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Crear cliente (admin, seller)' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  /**
   * PATCH /api/v1/customers/:id
   */
  @Patch(':id')
  @Roles('admin', 'seller')
  @ApiOperation({ summary: 'Actualizar cliente (admin, seller)' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }
}
