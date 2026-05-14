import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── PRODUCTOS ────────────────────────────────────────────────────────────

  async findAll(filters: FilterProductDto) {
    const { search, categoryId, isActive, lowStock, page = 1, limit = 20 } = filters;
    // categoryIds viene como string[] del query param → convertir a number[]
    const rawIds = (filters as any).categoryIds;
    const categoryIds: number[] | undefined = rawIds
      ? (Array.isArray(rawIds) ? rawIds : [rawIds]).map(Number).filter(Boolean)
      : undefined;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name:    { contains: search, mode: 'insensitive' } },
        { sku:     { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Soporte para filtro múltiple (padre + hijos) o filtro simple
    if (categoryIds?.length) {
      where.categoryId = { in: categoryIds };
    } else if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    if (isActive !== undefined) where.isActive = isActive;

    if (lowStock) {
      where.stock = { some: { quantity: { lte: 0 } } };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take:     limit,
        orderBy:  { name: 'asc' },
        include: {
          category: { select: { id: true, name: true, parentId: true } },
          stock:    { select: { quantity: true, minStock: true, warehouseId: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = items.map((p) => {
      const totalStock = p.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
      const minStock   = p.stock.reduce((sum, s) => sum + Number(s.minStock),  0);
      return { ...p, totalStock, isLowStock: totalStock <= minStock };
    });

    // Retornar { data, total, page, limit } — formato que espera el frontend
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stock:    true,
        supplierProducts: {
          include: { supplier: { select: { id: true, name: true, code: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    const totalStock = product.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
    return { ...product, totalStock };
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        stock:    { select: { quantity: true, warehouseId: true } },
      },
    });
    if (!product) throw new NotFoundException(`Producto con barcode ${barcode} no encontrado`);

    const totalStock = product.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
    return { ...product, totalStock };
  }

  async create(dto: CreateProductDto) {
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({ where: { sku: dto.sku } });
      if (existing) throw new ConflictException(`El SKU ${dto.sku} ya existe`);
    }
    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({ where: { barcode: dto.barcode } });
      if (existing) throw new ConflictException(`El código de barras ${dto.barcode} ya existe`);
    }

    return this.prisma.product.create({
      data: {
        name:            dto.name,
        sku:             dto.sku ?? `SKU-${Date.now()}`,
        barcode:         dto.barcode,
        description:     dto.description,
        spec:            dto.spec,
        unit:            dto.unit ?? 'Unid',
        notes:           dto.notes,
        costPrice:       dto.costPrice       ?? 0,
        retailPrice:     dto.retailPrice     ?? 0,
        wholesalePrice1: dto.wholesalePrice1 ?? 0,
        wholesalePrice2: dto.wholesalePrice2 ?? 0,
        wholesalePrice3: dto.wholesalePrice3 ?? 0,
        memberPrice:     dto.memberPrice     ?? 0,
        vipPrice2:       dto.vipPrice2       ?? 0,
        vipPrice3:       dto.vipPrice3       ?? 0,
        vipPrice4:       dto.vipPrice4       ?? 0,
        vipPrice5:       dto.vipPrice5       ?? 0,
        taxRate:         dto.taxRate         ?? 0.18,
        isTaxExempt:     dto.isTaxExempt     ?? false,
        isActive:        dto.isActive        ?? true,
        isPublished:     dto.isPublished     ?? true,
        isFeatured:      dto.isFeatured      ?? false,
        categoryId:      dto.categoryId ? Number(dto.categoryId) : undefined,
        mainImageUrl:    dto.mainImageUrl,
      },
      include: { category: { select: { id: true, name: true, parentId: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({ where: { sku: dto.sku, NOT: { id } } });
      if (existing) throw new ConflictException(`El SKU ${dto.sku} ya existe`);
    }
    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({ where: { barcode: dto.barcode, NOT: { id } } });
      if (existing) throw new ConflictException(`El código de barras ${dto.barcode} ya existe`);
    }

    // Mapear todos los campos opcionales
    const data: any = {};
    const fields = [
      'name','sku','barcode','description','spec','unit','notes',
      'costPrice','retailPrice',
      'wholesalePrice1','wholesalePrice2','wholesalePrice3',
      'memberPrice','vipPrice2','vipPrice3','vipPrice4','vipPrice5',
      'taxRate','isTaxExempt','isActive','isPublished','isFeatured','mainImageUrl',
    ] as const;

    for (const f of fields) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f];
    }
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId ? Number(dto.categoryId) : null;

    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, parentId: true } } },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data:  { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  }

  async activate(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data:  { isActive: true },
      select: { id: true, name: true, isActive: true },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  // ─── CATEGORÍAS ────────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`La categoría "${dto.name}" ya existe`);
    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(id: number, dto: CreateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: number) {
    const cat = await this.prisma.category.findUnique({
      where:   { id },
      include: { _count: { select: { products: true } } },
    });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    if (cat._count.products > 0)
      throw new ConflictException(`No se puede eliminar: la categoría tiene ${cat._count.products} productos`);
    return this.prisma.category.delete({ where: { id } });
  }
}
