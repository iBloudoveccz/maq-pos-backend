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

    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive;

    // Filtrar productos con stock bajo (stock actual <= minStock)
    if (lowStock) {
      where.stock = {
        some: {
          quantity: { lte: this.prisma.$queryRaw`"min_stock"` },
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
          stock:    { select: { quantity: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calcular stock total sumando todos los almacenes
    const itemsWithStock = items.map((p) => ({
      ...p,
      totalStock: p.stock.reduce((sum, s) => sum + s.quantity, 0),
      isLowStock: p.stock.reduce((sum, s) => sum + s.quantity, 0) <= (p.minStock ?? 0),
    }));

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
        stock: true,
        suppliers: {
          include: { supplier: { select: { id: true, name: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    return {
      ...product,
      totalStock: product.stock.reduce((sum, s) => sum + s.quantity, 0),
    };
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        stock:    { select: { quantity: true } },
      },
    });
    if (!product) throw new NotFoundException(`Producto con barcode ${barcode} no encontrado`);

    return {
      ...product,
      totalStock: product.stock.reduce((sum, s) => sum + s.quantity, 0),
    };
  }

  async create(dto: CreateProductDto) {
    // Verificar SKU único si se proporcionó
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({ where: { sku: dto.sku } });
      if (existing) throw new ConflictException(`El SKU ${dto.sku} ya existe`);
    }

    // Verificar barcode único si se proporcionó
    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({ where: { barcode: dto.barcode } });
      if (existing) throw new ConflictException(`El código de barras ${dto.barcode} ya existe`);
    }

    return this.prisma.product.create({
      data: {
        name:           dto.name,
        sku:            dto.sku,
        barcode:        dto.barcode,
        description:    dto.description,
        costPrice:      dto.costPrice,
        salePrice:      dto.salePrice,
        wholesalePrice: dto.wholesalePrice,
        unit:           dto.unit,
        spec:           dto.spec,
        minStock:       dto.minStock ?? 0,
        categoryId:     dto.categoryId,
        isActive:       dto.isActive ?? true,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // lanza 404 si no existe

    // Verificar unicidad de SKU si cambia
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, NOT: { id } },
      });
      if (existing) throw new ConflictException(`El SKU ${dto.sku} ya existe`);
    }

    // Verificar unicidad de barcode si cambia
    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, NOT: { id } },
      });
      if (existing) throw new ConflictException(`El código de barras ${dto.barcode} ya existe`);
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  }

  async activate(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, name: true, isActive: true },
    });
  }

  // ─── CATEGORÍAS ───────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.productCategory.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`La categoría "${dto.name}" ya existe`);

    return this.prisma.productCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: CreateCategoryDto) {
    const cat = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return this.prisma.productCategory.update({ where: { id }, data: dto });
  }
}
