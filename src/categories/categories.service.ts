import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        children: {
          include: { _count: { select: { products: true } } },
        },
      },
    });
    if (!category) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return category;
  }

  async create(dto: CreateCategoryDto) {
    // Valida que el padre exista si se envió parentId
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException(`Categoría padre ${dto.parentId} no encontrada`);
      // Solo permite 1 nivel de anidamiento (igual que S12)
      if (parent.parentId !== null) {
        throw new BadRequestException('Solo se permite un nivel de subcategorías');
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim().toUpperCase(),
        parentId: dto.parentId ?? null,
      },
      include: { _count: { select: { products: true } } },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id); // verifica que exista

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException(`Categoría padre ${dto.parentId} no encontrada`);
      if (parent.parentId !== null) {
        throw new BadRequestException('Solo se permite un nivel de subcategorías');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim().toUpperCase() }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: { _count: { select: { products: true } } },
    });
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    if ((category._count?.products ?? 0) > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la categoría tiene ${category._count.products} producto(s) asociado(s)`
      );
    }

    // Si tiene subcategorías también bloquear
    const childrenCount = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (childrenCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la categoría tiene ${childrenCount} subcategoría(s)`
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
