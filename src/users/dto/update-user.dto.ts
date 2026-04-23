import { IsEmail, IsString, MinLength, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'juan@pos.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @ApiPropertyOptional({ example: 'seller', enum: ['admin', 'seller', 'warehouse', 'billing'] })
  @IsOptional()
  @IsIn(['admin', 'seller', 'warehouse', 'billing'])
  role?: string;

  @ApiPropertyOptional({ example: '+51 987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({ example: 'nuevaPassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
