import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterPurchaseDto {
  @ApiPropertyOptional({ example: 'supplier-uuid' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 'Factura 001' })
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

export class CreateSupplierDto {
  @ApiPropertyOptional({ example: 'Distribuidora Lima SAC' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '20123456789', description: 'RUC del proveedor' })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({ example: '+51 987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'ventas@distribuidora.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Av. Industrial 456, Lima' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Pago a 30 días' })
  @IsOptional()
  @IsString()
  notes?: string;
}
