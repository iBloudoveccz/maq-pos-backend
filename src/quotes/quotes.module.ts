import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';

@Module({
  providers: [QuotesService],
  controllers: [QuotesController],
  exports: [QuotesService], // exportado para payments y shipments
})
export class QuotesModule {}
