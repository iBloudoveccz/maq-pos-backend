import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Credenciales incorrectas');
    if (!user.isActive) throw new UnauthorizedException('Usuario inactivo. Contacta al administrador');

    // FIX: era user.password → ahora user.passwordHash
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Credenciales incorrectas');

    // FIX: user.email puede ser null → usar ?? ''
    const token = await this.signToken(user.id, user.email ?? '', user.role, user.name);

    return {
      accessToken: token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        code:  user.code,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:        true,
        code:      true,
        name:      true,
        email:     true,
        role:      true,
        isActive:  true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    // FIX: era user.password → user.passwordHash
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    // FIX: era data: { password: hashed } → data: { passwordHash: hashed }
    await this.prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: hashed },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  private async signToken(
    userId: string,
    email: string,
    role: string,
    name: string,
  ): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email, role, name },
      { expiresIn: '8h' },
    );
  }
}
