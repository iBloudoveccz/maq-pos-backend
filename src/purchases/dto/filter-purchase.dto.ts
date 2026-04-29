import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterPurchaseDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class CreateSupplierDto {
  // FIX: 'code' es @unique y requerido en Supplier (equivale a Ghscode del S12)
  @ApiProperty({ example: '619', description: 'Código único del proveedor (Ghscode)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Distribuidora SAC' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '20123456789' })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'proveedor@email.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Jr. Lima 123, Tarapoto' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
