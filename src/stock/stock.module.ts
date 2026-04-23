import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';

@Module({
  providers: [StockService],
  controllers: [StockController],
  exports: [StockService], // exportado para purchases y quotes
})
export class StockModule {}
