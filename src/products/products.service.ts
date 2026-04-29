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
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name:    { contains: search, mode: 'insensitive' } },
        { sku:     { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // FIX: categoryId llega como string del query param → convertir a número
    if (categoryId) where.categoryId = Number(categoryId);
    if (isActive !== undefined) where.isActive = isActive;

    // FIX: lowStock filtra por stock.quantity <= stock.minStock
    if (lowStock) {
      where.stock = {
        some: {
          quantity: { lte: 0 }, // simplificado: stock en 0 o menos
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          // FIX: incluir minStock de la tabla stock
          stock: { select: { quantity: true, minStock: true, warehouseId: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // FIX: Decimal → Number() antes de operar con +
    const itemsWithStock = items.map((p) => {
      const totalStock  = p.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
      const minStock    = p.stock.reduce((sum, s) => sum + Number(s.minStock), 0);
      return {
        ...p,
        totalStock,
        isLowStock: totalStock <= minStock,
      };
    });

    return {
      items: itemsWithStock,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stock:    true,
        // FIX: era 'suppliers' → ahora es 'supplierProducts'
        supplierProducts: {
          include: { supplier: { select: { id: true, name: true, code: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    // FIX: Decimal → Number()
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
        name:        dto.name,
        sku:         dto.sku ?? `SKU-${Date.now()}`,
        barcode:     dto.barcode,
        description: dto.description,
        spec:        dto.spec,
        unit:        dto.unit ?? 'Unid',

        // FIX: nombres corregidos según nuevo schema
        costPrice:       dto.costPrice       ?? 0,
        retailPrice:     dto.retailPrice     ?? 0,  // era salePrice
        wholesalePrice1: dto.wholesalePrice1 ?? 0,  // era wholesalePrice

        taxRate:    dto.taxRate    ?? 0.18,
        isActive:   dto.isActive   ?? true,
        isPublished: dto.isPublished ?? true,

        // FIX: categoryId → Number (el schema espera Int)
        categoryId: dto.categoryId ? Number(dto.categoryId) : undefined,
        // NOTA: minStock ya no está en Product — está en Stock por almacén
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, NOT: { id } },
      });
      if (existing) throw new ConflictException(`El SKU ${dto.sku} ya existe`);
    }

    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, NOT: { id } },
      });
      if (existing) throw new ConflictException(`El código de barras ${dto.barcode} ya existe`);
    }

    // FIX: construir data explícitamente para evitar pasar campos inválidos
    const data: any = {};
    if (dto.name        !== undefined) data.name        = dto.name;
    if (dto.sku         !== undefined) data.sku         = dto.sku;
    if (dto.barcode     !== undefined) data.barcode     = dto.barcode;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.spec        !== undefined) data.spec        = dto.spec;
    if (dto.unit        !== undefined) data.unit        = dto.unit;
    if (dto.costPrice       !== undefined) data.costPrice       = dto.costPrice;
    if (dto.retailPrice     !== undefined) data.retailPrice     = dto.retailPrice;
    if (dto.wholesalePrice1 !== undefined) data.wholesalePrice1 = dto.wholesalePrice1;
    if (dto.taxRate     !== undefined) data.taxRate     = dto.taxRate;
    if (dto.isActive    !== undefined) data.isActive    = dto.isActive;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.isFeatured  !== undefined) data.isFeatured  = dto.isFeatured;
    if (dto.categoryId  !== undefined) data.categoryId  = Number(dto.categoryId);

    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
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

  // ─── CATEGORÍAS ────────────────────────────────────────────────────────────

  async findAllCategories() {
    // FIX: era this.prisma.productCategory → ahora es this.prisma.category
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    // FIX: era this.prisma.productCategory → this.prisma.category
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`La categoría "${dto.name}" ya existe`);

    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(id: number, dto: CreateCategoryDto) {
    // FIX: id es Int en Category, no String
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return this.prisma.category.update({ where: { id }, data: dto });
  }
}
