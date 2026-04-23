import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService], // exportado para que stock y quotes puedan usarlo
})
export class ProductsModule {}
