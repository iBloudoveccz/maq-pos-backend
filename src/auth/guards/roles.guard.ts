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

    // Admin siempre tiene acceso
    if (user.role === 'admin') return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Acceso denegado. Roles permitidos: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}
