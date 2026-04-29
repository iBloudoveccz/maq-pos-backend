import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  // FIX: code es requerido en el nuevo schema (equivale a Rycode del S12)
  @ApiProperty({ example: '777', description: 'Código único del operador (Rycode del S12)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'juan@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'contraseña123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'SELLER', enum: ['ADMIN','SELLER','WAREHOUSE','BILLING','CASHIER'] })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  phone?: string;
}
