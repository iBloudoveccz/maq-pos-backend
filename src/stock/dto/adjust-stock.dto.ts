import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 10, description: 'Cantidad a ajustar (positivo=entrada, negativo=salida)' })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({
    example: 'ADJUSTMENT',
    enum: ['ADJUSTMENT', 'OWNUSE', 'RETURN', 'STOCKTAKING'],
    description: 'Tipo de movimiento',
  })
  @IsIn(['ADJUSTMENT', 'OWNUSE', 'RETURN', 'STOCKTAKING'])
  movementType: string;

  @ApiPropertyOptional({ example: 'Corrección de inventario' })
  @IsOptional()
  @IsString()
  notes?: string;
}
