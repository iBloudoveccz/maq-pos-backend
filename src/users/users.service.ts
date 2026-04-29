import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SAFE_SELECT = {
  id:        true,
  code:      true,   // FIX: agregado — campo nuevo en el schema
  name:      true,
  email:     true,
  role:      true,
  phone:     true,
  isActive:  true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: string) {
    // FIX: role debe ser UserRole enum, no string
    const where = role
      ? { role: role as UserRole }
      : undefined;

    return this.prisma.user.findMany({
      where,
      select: SAFE_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUserDto, createdById: string) {
    // Verificar email único
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException(`El email ${dto.email} ya está registrado`);
      }
    }

    // Verificar code único (requerido en el nuevo schema)
    if (!dto.code) {
      throw new BadRequestException('El código de operador es requerido');
    }
    const existingCode = await this.prisma.user.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException(`El código ${dto.code} ya está en uso`);
    }

    // FIX: era data.password → data.passwordHash
    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        code:         dto.code,
        name:         dto.name,
        email:        dto.email,
        passwordHash: hashed,    // FIX: era password → passwordHash
        role:         dto.role as UserRole ?? UserRole.SELLER,
        phone:        dto.phone,
        createdById,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: string) {
    await this.findOne(id);

    if ((dto.role || dto.isActive !== undefined) && requesterRole !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede cambiar roles o estado');
    }

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (existing) throw new ConflictException(`El email ${dto.email} ya está en uso`);
    }

    // FIX: construir data explícitamente para evitar pasar campos inválidos
    const data: any = {};
    if (dto.name     !== undefined) data.name     = dto.name;
    if (dto.email    !== undefined) data.email    = dto.email;
    if (dto.phone    !== undefined) data.phone    = dto.phone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.role     !== undefined) data.role     = dto.role as UserRole;

    return this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findOne(id);
    const hashed = await bcrypt.hash(dto.newPassword, 10);

    // FIX: era data.password → data.passwordHash
    await this.prisma.user.update({
      where: { id },
      data:  { passwordHash: hashed },
    });

    return { message: `Contraseña del usuario ${id} restablecida correctamente` };
  }

  async deactivate(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('No puedes desactivar tu propio usuario');
    }
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data:  { isActive: false },
      select: SAFE_SELECT,
    });
  }

  async activate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data:  { isActive: true },
      select: SAFE_SELECT,
    });
  }
}
