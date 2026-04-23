import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  /**
   * GET /shipments
   * Warehouse ve todos. Seller solo ve los de sus pedidos.
   * Query params: status, courier_id, date_from, date_to, page, limit
   */
  @Get()
  @Roles('admin', 'warehouse', 'seller')
  findAll(
    @Query('status') status?: string,
    @Query('courier_id') courierId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.shipmentsService.findAll({
      status,
      courierId: courierId ? parseInt(courierId) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  /**
   * GET /shipments/pending
   * Despachos pendientes — vista principal del almacenero
   */
  @Get('pending')
  @Roles('admin', 'warehouse')
  getPending() {
    return this.shipmentsService.findByStatus('pending');
  }

  /**
   * GET /shipments/in-transit
   * Despachos en tránsito — para seguimiento
   */
  @Get('in-transit')
  @Roles('admin', 'warehouse', 'seller')
  getInTransit() {
    return this.shipmentsService.findByStatus('in_transit');
  }

  /**
   * GET /shipments/stats
   * Resumen estadístico de despachos (admin/warehouse)
   */
  @Get('stats')
  @Roles('admin', 'warehouse')
  getStats(@Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    return this.shipmentsService.getStats({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  /**
   * GET /shipments/:id
   * Detalle de un despacho con historial
   */
  @Get(':id')
  @Roles('admin', 'warehouse', 'seller')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentsService.findOne(id);
  }

  /**
   * PATCH /shipments/:id
   * Actualizar estado y/o número de guía.
   * Solo warehouse/admin pueden cambiar estado.
   * Estados válidos: pending → preparing → shipped → in_transit → delivered | failed
   */
  @Patch(':id')
  @Roles('admin', 'warehouse')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateShipmentDto: UpdateShipmentDto,
    @Request() req,
  ) {
    return this.shipmentsService.update(id, updateShipmentDto, req.user.id);
  }

  /**
   * POST /shipments/:id/dispatch
   * Marcar como despachado: registra número de guía y cambia estado a shipped.
   * Acción principal del almacenero cuando entrega el paquete al courier.
   */
  @Post(':id/dispatch')
  @Roles('admin', 'warehouse')
  @HttpCode(HttpStatus.OK)
  dispatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tracking_number: string; courier_id?: number; notes?: string },
    @Request() req,
  ) {
    return this.shipmentsService.dispatch(id, {
      trackingNumber: body.tracking_number,
      courierId: body.courier_id,
      notes: body.notes,
      userId: req.user.id,
    });
  }

  /**
   * POST /shipments/:id/deliver
   * Marcar como entregado. Estado final exitoso.
   */
  @Post(':id/deliver')
  @Roles('admin', 'warehouse')
  @HttpCode(HttpStatus.OK)
  markDelivered(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { notes?: string },
    @Request() req,
  ) {
    return this.shipmentsService.markDelivered(id, body.notes, req.user.id);
  }

  /**
   * POST /shipments/:id/fail
   * Marcar como fallido (dirección incorrecta, cliente ausente, etc.)
   */
  @Post(':id/fail')
  @Roles('admin', 'warehouse')
  @HttpCode(HttpStatus.OK)
  markFailed(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    return this.shipmentsService.markFailed(id, body.reason, req.user.id);
  }

  /**
   * GET /shipments/:id/history
   * Historial completo de cambios de estado de un despacho
   */
  @Get(':id/history')
  @Roles('admin', 'warehouse', 'seller')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentsService.getHistory(id);
  }
}
