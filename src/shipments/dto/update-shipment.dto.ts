import { IsString, IsOptional, IsInt, IsIn } from 'class-validator';

export class UpdateShipmentDto {
  @IsOptional()
  @IsIn(['pending', 'preparing', 'shipped', 'in_transit', 'delivered', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  tracking_number?: string;

  @IsOptional()
  @IsInt()
  courier_id?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;
}
