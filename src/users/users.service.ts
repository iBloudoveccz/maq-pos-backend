import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Campos seguros a devolver — nunca incluir password
const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
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
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`El email ${dto.email} ya está registrado`);
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role,
        phone: dto.phone,
      },
      select: SAFE_SELECT,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: string) {
    await this.findOne(id); // lanza 404 si no existe

    // Solo admin puede cambiar roles o activar/desactivar
    if ((dto.role || dto.isActive !== undefined) && requesterRole !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede cambiar roles o estado');
    }

    // Verificar email único si se está cambiando
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`El email ${dto.email} ya está en uso`);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: SAFE_SELECT,
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findOne(id); // lanza 404 si no existe

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return { message: `Contraseña del usuario ${id} restablecida correctamente` };
  }

  async deactivate(id: string, requesterId: string) {
    // No puede desactivarse a sí mismo
    if (id === requesterId) {
      throw new ForbiddenException('No puedes desactivar tu propio usuario');
    }

    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
  }

  async activate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: SAFE_SELECT,
    });
  }
}
