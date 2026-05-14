import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsNumber, IsArray,
  ValidateNested, IsDateString, IsPositive, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaleItemDto {
  @ApiProperty() @IsString() productId: string;
  @ApiProperty() @IsString() productName: string;
  @ApiProperty() @IsString() unit: string;
  @ApiProperty() @IsNumber() @IsPositive() quantity: number;
  @ApiProperty() @IsNumber() @Min(0) salePrice: number;
  @ApiProperty() @IsNumber() @Min(0) costPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
}

export class SalePaymentDto {
  @ApiProperty() @IsString() paymentMethodId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiProperty() @IsNumber() @Min(0) amountTendered: number;
  @ApiProperty() @IsNumber() @Min(0) amountPaid: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) changeAmount?: number;
}

export class CreateSaleDto {
  @ApiProperty() @IsString() folio: string;
  @ApiProperty() @IsDateString() saleDate: string;
  @ApiProperty() @IsDateString() saleTime: string;
  @ApiProperty() @IsString() cashierId: string;
  @ApiProperty() @IsString() terminalId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shiftId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() loyaltyCardId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ssid?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gcCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freightAmount?: number;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiProperty({ type: [SalePaymentDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SalePaymentDto)
  payments: SalePaymentDto[];
}

export class VoidSaleDto {
  @ApiProperty() @IsString() reason: string;
  @ApiProperty() @IsString() operatorId: string;
}
