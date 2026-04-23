import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Calzado' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Zapatos, zapatillas y sandalias' })
  @IsOptional()
  @IsString()
  description?: string;
}
