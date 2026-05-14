// ─── dto/sale-filters.dto.ts ──────────────────────────────────────────────
import { IsOptional, IsString, IsInt, Min, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SaleFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;            // busca en folio o RUC/DNI

  @ApiPropertyOptional() @IsOptional() @IsString()
  cashierId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  terminalId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  warehouseId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ enum: ['VALID', 'VOID', 'ALL'] })
  @IsOptional() @IsIn(['VALID', 'VOID', 'ALL'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateTo?: string;
}
