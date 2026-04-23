import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan@pos.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    example: 'seller',
    enum: ['admin', 'seller', 'warehouse', 'billing'],
    description: 'admin | seller | warehouse | billing',
  })
  @IsIn(['admin', 'seller', 'warehouse', 'billing'], {
    message: 'Rol inválido. Usa: admin, seller, warehouse o billing',
  })
  role: string;

  @ApiPropertyOptional({ example: '+51 987654321' })
  @IsOptional()
  @IsString()
  phone?: string;
}
