import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Carlos Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+51 987654321', description: 'WhatsApp o teléfono principal' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'carlos@gmail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'DNI o RUC' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({
    example: 'DNI',
    enum: ['DNI', 'RUC', 'CE', 'PASAPORTE'],
  })
  @IsOptional()
  @IsIn(['DNI', 'RUC', 'CE', 'PASAPORTE'])
  documentType?: string;

  @ApiPropertyOptional({ example: 'Av. Los Pinos 123, Tarapoto' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Cliente referido por Juan' })
  @IsOptional()
  @IsString()
  notes?: string;
}
