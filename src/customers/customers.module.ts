import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './dto/customers.controller';

@Module({
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService], // exportado para quotes
})
export class CustomersModule {}
