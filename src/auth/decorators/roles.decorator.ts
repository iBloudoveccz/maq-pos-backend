import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles disponibles:
 * - admin     → acceso total
 * - seller    → cotizaciones, pagos, clientes
 * - warehouse → stock, compras, despachos
 * - billing   → comprobantes SUNAT
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
