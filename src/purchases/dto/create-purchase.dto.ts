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

  @ApiProperty({ example: 12, description: 'Cantidad comprada' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 1.56, description: 'Precio de costo unitario' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  unitCost: number;

  @ApiPropertyOptional({ example: 2.00, description: 'Precio de venta sugerido — actualiza el producto si se envía' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  salePrice?: number;
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

  @ApiPropertyOptional({ example: 'Factura BCP 001-00123' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 0, description: 'IGV de la compra en soles' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tax?: number;

  @ApiPropertyOptional({ example: 'Inventario inicial de temporada' })
  @IsOptional()
  @IsString()
  notes?: string;
}
