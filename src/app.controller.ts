import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /**
   * GET /health
   * Usado por Railway para verificar que el servidor está activo.
   * NO requiere autenticación.
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };
  }
}
