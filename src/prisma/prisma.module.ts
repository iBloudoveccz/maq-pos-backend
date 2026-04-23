import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()  // Disponible en todos los módulos sin importar explícitamente
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
