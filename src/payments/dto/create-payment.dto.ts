import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({ example: 'quote-uuid' })
  @IsString()
  quoteId: string;

  @ApiProperty({ example: 'payment-method-uuid' })
  @IsString()
  paymentMethodId: string;

  @ApiProperty({ example: 69.50, description: 'Monto pagado' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: 'Transferencia BCP operación 123456' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Cliente pagó en dos partes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
