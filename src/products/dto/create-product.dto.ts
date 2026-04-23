import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'CROCS ADIDAS TALLA 42' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: '7751820003149' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'Calzado cómodo para uso diario' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12.61, description: 'Precio de costo' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  costPrice: number;

  @ApiProperty({ example: 16.50, description: 'Precio de venta al público' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  salePrice: number;

  @ApiPropertyOptional({ example: 14.00, description: 'Precio mayorista' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesalePrice?: number;

  @ApiProperty({ example: 'Unid', description: 'Unidad de medida' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ example: 'Talla 42' })
  @IsOptional()
  @IsString()
  spec?: string;

  @ApiPropertyOptional({ example: 0, description: 'Stock mínimo para alerta' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @ApiPropertyOptional({ example: 'cat-uuid-aqui' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
