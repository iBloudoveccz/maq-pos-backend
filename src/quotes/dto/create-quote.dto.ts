import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsPositive,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuoteItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ example: 15.00, description: 'Precio personalizado — si no se envía se usa el precio de venta del producto' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 'Talla 42, color rojo' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateQuoteDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  customerId: string;

  @ApiProperty({ type: [QuoteItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'La cotización debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @ApiPropertyOptional({ example: 10.00, description: 'Descuento en soles sobre el total' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ example: 15.00, description: 'Costo de envío' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shippingCost?: number;

  @ApiPropertyOptional({ example: 'Envío a Moyobamba, coordinar entrega' })
  @IsOptional()
  @IsString()
  notes?: string;
}
