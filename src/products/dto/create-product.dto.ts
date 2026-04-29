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

  @ApiPropertyOptional({ example: 'Talla 42' })
  @IsOptional()
  @IsString()
  spec?: string;

  @ApiProperty({ example: 'Unid', description: 'Unidad de medida' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 12.61, description: 'Precio de costo' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  costPrice: number;

  // FIX: era salePrice → retailPrice (S12: lsj)
  @ApiProperty({ example: 16.50, description: 'Precio de venta al público (lsj)' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  retailPrice: number;

  // FIX: era wholesalePrice → wholesalePrice1 (S12: pfj)
  @ApiPropertyOptional({ example: 14.00, description: 'Precio mayorista nivel 1 (pfj)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesalePrice1?: number;

  @ApiPropertyOptional({ example: 13.00, description: 'Precio mayorista nivel 2 (pfj2)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesalePrice2?: number;

  @ApiPropertyOptional({ example: 12.00, description: 'Precio mayorista nivel 3 (pfj3)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesalePrice3?: number;

  @ApiPropertyOptional({ example: 15.00, description: 'Precio miembro base (Hyj)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  memberPrice?: number;

  // FIX: agregado taxRate
  @ApiPropertyOptional({ example: 0.18, description: 'Tasa IGV (0.18 = 18%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  taxRate?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isTaxExempt?: boolean;

  // FIX: agregado isPublished (visible en tienda web)
  @ApiPropertyOptional({ example: true, description: 'Visible en catálogo web' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // FIX: agregado isFeatured (destacado en tienda web)
  @ApiPropertyOptional({ example: false, description: 'Destacado en vitrina' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'ID de categoría (número entero)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Par de crocs originales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
