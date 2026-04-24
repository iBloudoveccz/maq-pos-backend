import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, cualquier usuario autenticado puede pasar
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) throw new ForbiddenException('No autenticado');

    // Comparación case-insensitive: el enum UserRole en BD es MAYÚSCULAS (ADMIN, SELLER...)
    // pero los controllers usan strings en minúsculas (@Roles('admin', 'seller')).
    // Tanda 2: normalizar todo a UserRole enum y eliminar este toUpperCase().
    const userRole = String(user.role ?? '').toUpperCase();
    const required = requiredRoles.map((r) => r.toUpperCase());

    // Admin siempre tiene acceso
    if (userRole === 'ADMIN') return true;

    if (!required.includes(userRole)) {
      throw new ForbiddenException(
        `Acceso denegado. Roles permitidos: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
