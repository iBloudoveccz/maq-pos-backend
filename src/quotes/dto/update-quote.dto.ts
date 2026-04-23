import { IsOptional, IsString, IsNumber, IsIn, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateQuoteDto {
  @ApiPropertyOptional({ example: 'Envío urgente' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 5.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ example: 10.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shippingCost?: number;
}

export class FilterQuoteDto {
  @ApiPropertyOptional({ example: 'customer-uuid' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'PENDING',
    enum: ['PENDING', 'APPROVED', 'PAID', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'PAID', 'DISPATCHED', 'DELIVERED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 'COT-001', description: 'Busca por número de cotización o nombre de cliente' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
