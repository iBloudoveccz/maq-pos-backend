import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

/**
 * ShipmentsService
 *
 * ⚠️ ESQUELETO TANDA 1 — todos los métodos lanzan NotImplementedException.
 * El objetivo de Tanda 1 es que el proyecto compile. La implementación real
 * va en Tanda 2 junto con los siguientes ajustes pendientes:
 *
 * MISMATCHES PENDIENTES (Tanda 2):
 *
 *  1. ID: el controller hace `@Param('id', ParseIntPipe)` y declara `id: number`,
 *     pero `Shipment.id` en el schema es `String @default(uuid())`. Hay que
 *     decidir: cambiar el controller a aceptar string (recomendado), o agregar
 *     un id numérico secundario al modelo Shipment.
 *
 *  2. STATUS: el controller acepta strings en minúsculas
 *     ('pending', 'preparing', 'shipped', 'in_transit', 'delivered', 'failed'),
 *     pero el enum `ShipmentStatus` es:
 *     PENDING | SHIPPED | IN_TRANSIT | DELIVERED | RETURNED.
 *     Faltan 'preparing' y 'failed' (¿agregar al enum o mapear a otros?).
 *
 *  3. SNAKE_CASE en el DTO: `tracking_number`, `courier_id`, `shipping_address`
 *     vs el schema en camelCase: `trackingNumber`, `courierId`, etc.
 *     Hay que renombrar los campos del DTO (o mapear en el service).
 *
 *  4. ROLES: `@Roles('admin', 'warehouse', 'seller')` en minúsculas. El
 *     RolesGuard ya hace toUpperCase para que funcionen ambos, pero conviene
 *     normalizar a `UserRole.ADMIN`, etc., y eliminar el toUpperCase del guard.
 */
@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(opts: {
    status?:    string;
    courierId?: number;
    dateFrom?:  Date;
    dateTo?:    Date;
    page:       number;
    limit:      number;
  }) {
    throw new NotImplementedException(
      'ShipmentsService.findAll — pendiente Tanda 2. ' +
      'Hay que mapear status (lowercase → ShipmentStatus enum) y resolver id (uuid).',
    );
  }

  findByStatus(status: string) {
    throw new NotImplementedException(
      `ShipmentsService.findByStatus("${status}") — pendiente Tanda 2.`,
    );
  }

  getStats(opts: { dateFrom?: Date; dateTo?: Date }) {
    throw new NotImplementedException(
      'ShipmentsService.getStats — pendiente Tanda 2.',
    );
  }

  findOne(id: number) {
    throw new NotImplementedException(
      `ShipmentsService.findOne(${id}) — pendiente Tanda 2. Decidir: id numérico o uuid string.`,
    );
  }

  update(id: number, dto: UpdateShipmentDto, userId: string) {
    throw new NotImplementedException(
      `ShipmentsService.update(${id}) — pendiente Tanda 2.`,
    );
  }

  dispatch(
    id: number,
    opts: {
      trackingNumber: string;
      courierId?:     number;
      notes?:         string;
      userId:         string;
    },
  ) {
    throw new NotImplementedException(
      `ShipmentsService.dispatch(${id}) — pendiente Tanda 2.`,
    );
  }

  markDelivered(id: number, notes: string | undefined, userId: string) {
    throw new NotImplementedException(
      `ShipmentsService.markDelivered(${id}) — pendiente Tanda 2.`,
    );
  }

  markFailed(id: number, reason: string, userId: string) {
    throw new NotImplementedException(
      `ShipmentsService.markFailed(${id}) — pendiente Tanda 2. ` +
      'Nota: "failed" no existe en ShipmentStatus enum, ¿agregar o mapear a RETURNED?',
    );
  }

  getHistory(id: number) {
    throw new NotImplementedException(
      `ShipmentsService.getHistory(${id}) — pendiente Tanda 2.`,
    );
  }
}
