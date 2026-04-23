import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ─── CORS ─────────────────────────────────────────────────────────────────
  // En producción solo permite el frontend de Vercel
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── VALIDACIÓN GLOBAL ────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,
      transform: true,          // Transforma tipos automáticamente
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── PREFIJO GLOBAL ───────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── SWAGGER (solo en desarrollo) ─────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('POS Web API')
      .setDescription('API del sistema POS — NestJS + Prisma + PostgreSQL')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger disponible en /api/docs');
  }

  // ─── INICIAR SERVIDOR ─────────────────────────────────────────────────────
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Servidor corriendo en puerto ${port} [${process.env.NODE_ENV || 'development'}]`);
}

bootstrap();
