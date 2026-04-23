import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateCustomerDto } from './dto/create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class FilterCustomerDto {
  @ApiPropertyOptional({ example: 'Carlos', description: 'Busca en nombre, teléfono o documento' })
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
