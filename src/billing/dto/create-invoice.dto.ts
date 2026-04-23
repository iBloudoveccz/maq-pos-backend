import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
  IsPositive,
  Min,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unit_price: number; // precio SIN IGV

  @IsString()
  @IsOptional()
  unit_code?: string; // NIU=unidad, ZZ=servicio (catálogo SUNAT)

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax_rate?: number; // 0.18 por defecto (IGV 18%)
}

export class CreateInvoiceDto {
  /**
   * Tipo de comprobante:
   * '01' = Factura (requiere RUC)
   * '03' = Boleta de venta (DNI o anónimo)
   */
  @IsIn(['01', '03'])
  document_type: '01' | '03';

  /**
   * ID del pago asociado — la factura se genera sobre un pago confirmado
   */
  @IsNumber()
  payment_id: number;

  /**
   * ID del cliente (opcional — puede ser venta anónima para boletas)
   */
  @IsNumber()
  @IsOptional()
  customer_id?: number;

  /**
   * RUC del cliente — obligatorio para facturas (document_type='01')
   */
  @IsString()
  @IsOptional()
  customer_ruc?: string;

  /**
   * DNI del cliente — para boletas con identificación
   */
  @IsString()
  @IsOptional()
  customer_dni?: string;

  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsString()
  @IsOptional()
  customer_address?: string;

  @IsEmail()
  @IsOptional()
  customer_email?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
