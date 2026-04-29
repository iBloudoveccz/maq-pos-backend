import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsPositive,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 12, description: 'Cantidad comprada (Jhsl)' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 1.56, description: 'Precio de costo unitario (Jhj)' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  unitCost: number;

  // FIX: era salePrice → retailPrice (S12: Lsj)
  @ApiPropertyOptional({ example: 2.00, description: 'Precio de venta sugerido (Lsj) — actualiza el producto si se envía' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  retailPrice?: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 'supplier-uuid' })
  @IsString()
  supplierId: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'La compra debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @ApiPropertyOptional({ example: 'Factura 001-00123' })
  @IsOptional()
  @IsString()
  supplierInvoice?: string;

  // FIX: era 'tax' → 'taxAmount'
  @ApiPropertyOptional({ example: 0, description: 'IGV de la compra en soles (Tax)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;

  @ApiPropertyOptional({ example: 'Inventario inicial de temporada' })
  @IsOptional()
  @IsString()
  notes?: string;
}
