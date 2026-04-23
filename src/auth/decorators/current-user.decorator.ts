import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrae el usuario actual del request.
 * Uso: @CurrentUser() user — devuelve el objeto completo
 *      @CurrentUser('id') id — devuelve solo el id
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
