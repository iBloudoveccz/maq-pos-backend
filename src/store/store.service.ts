import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductQueryDto } from './dto/product-query.dto';

// Campos que exponemos públicamente de cada producto
const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  code: true,
  retailPrice: true,
  memberPrice: true,      // usado como "precio oferta" cuando < retailPrice
  mainImageUrl: true,
  taxRate: true,
  isTaxExempt: true,
  createdAt: true,
  category: {
    select: { id: true, name: true },
  },
  stocks: {
    select: { quantity: true },   // ← ajusta al nombre real del campo en tu schema
    where: {
      warehouse: { code: '01' },  // almacén principal
    },
  },
};

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  // ─── UTILIDAD: darle forma al producto para el frontend ─────────────────────
  private formatProduct(product: any) {
    const stock = product.stocks?.reduce((sum: number, s: any) => sum + (s.quantity ?? 0), 0) ?? 0;
const hasDiscount =
  Number(product.memberPrice) > 0 && Number(product.memberPrice) < Number(product.retailPrice);

    return {
      id: product.id,
      name: product.name,
      code: product.code,
      image: product.mainImageUrl ?? null,
      price: Number(product.retailPrice),
      salePrice: hasDiscount ? Number(product.memberPrice) : null,
      discount: hasDiscount
        ? Math.round(((product.retailPrice - product.memberPrice) / product.retailPrice) * 100)
        : null,
      category: product.category ?? null,
      inStock: stock > 0,
      stock,
      isNew: this.isNewProduct(product.createdAt),
      taxRate: Number(product.taxRate ?? 0),
      isTaxExempt: product.isTaxExempt ?? false,
    };
  }

  private isNewProduct(createdAt: Date): boolean {
    const DAYS = 30;
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < DAYS * 24 * 60 * 60 * 1000;
  }

  // ─── CATÁLOGO: listado con filtros y paginación ─────────────────────────────
  async getProducts(query: ProductQueryDto) {
    const { search, categoryId, minPrice, maxPrice, onSale, inStock, sort, page = 1, limit = 24 } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.retailPrice = {};
      if (minPrice !== undefined) where.retailPrice.gte = minPrice;
      if (maxPrice !== undefined) where.retailPrice.lte = maxPrice;
    }

    // "onSale" = memberPrice menor que retailPrice y mayor a 0
    if (onSale) {
      where.AND = [
        { memberPrice: { gt: 0 } },
        { memberPrice: { lt: this.prisma.$queryRaw`"retail_price"` } },
      ];
      // Forma alternativa sin raw SQL — traemos todos y filtramos en memoria
      // (funciona bien hasta ~10k productos)
      delete where.AND;
      where.memberPrice = { gt: 0 };
    }

    const orderBy = this.buildOrderBy(sort);

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: PUBLIC_PRODUCT_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    let formatted = items.map(p => this.formatProduct(p));

    // Filtro onSale en memoria (más simple que SQL para este volumen)
    if (onSale) {
      formatted = formatted.filter(p => p.salePrice !== null);
    }

    // Filtro inStock en memoria
    if (inStock) {
      formatted = formatted.filter(p => p.inStock);
    }

    return {
      data: formatted,
      meta: {
        total: onSale || inStock ? formatted.length : total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── DETALLE DE UN PRODUCTO ──────────────────────────────────────────────────
  async getProductById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      select: {
        ...PUBLIC_PRODUCT_SELECT,
        // Campos extra solo para el detalle
        wholesalePrice1: true,
        taxRate: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const base = this.formatProduct(product);

    // Productos relacionados (misma categoría, hasta 4)
    const related = await this.prisma.product.findMany({
      where: {
        categoryId: product.category?.id,
        isActive: true,
        id: { not: id },
      },
      select: PUBLIC_PRODUCT_SELECT,
      take: 4,
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...base,
      related: related.map(p => this.formatProduct(p)),
    };
  }

  // ─── DESTACADOS: para el home ─────────────────────────────────────────────
  async getFeatured() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return products.map(p => this.formatProduct(p));
  }

  // ─── NUEVOS: últimos 30 días ─────────────────────────────────────────────
  async getNewArrivals() {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        createdAt: { gte: since },
      },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return products.map(p => this.formatProduct(p));
  }

  // ─── OFERTAS: memberPrice < retailPrice ──────────────────────────────────
  async getOnSale() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        memberPrice: { gt: 0 },
      },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    // Filtrar los que realmente tienen descuento
    const onSale = products
      .map(p => this.formatProduct(p))
      .filter(p => p.salePrice !== null)
      .slice(0, 20);

    return onSale;
  }

  // ─── CATEGORÍAS ───────────────────────────────────────────────────────────
  async getCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Solo categorías que tienen al menos 1 producto activo
    return categories
      .filter(c => c._count.products > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        productCount: c._count.products,
      }));
  }

  // ─── BÚSQUEDA RÁPIDA: para el input de búsqueda en tiempo real ────────────
  async quickSearch(q: string) {
    if (!q || q.length < 2) return [];

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        retailPrice: true,
        memberPrice: true,
        mainImageUrl: true,
        category: { select: { name: true } },
      },
      take: 6,
    });

    return products.map(p => ({
      id: p.id,
      name: p.name,
      image: p.mainImageUrl,
      price: Number(p.retailPrice),
      salePrice: Number(p.memberPrice) > 0 && Number(p.memberPrice) < Number(p.retailPrice)
        ? Number(p.memberPrice)
        : null,
      category: p.category?.name ?? null,
    }));
  }

  // ─── UTILIDAD INTERNA ─────────────────────────────────────────────────────
  private buildOrderBy(sort?: string) {
    switch (sort) {
      case 'price_asc':  return { retailPrice: 'asc' as const };
      case 'price_desc': return { retailPrice: 'desc' as const };
      case 'name_asc':   return { name: 'asc' as const };
      case 'newest':
      default:           return { createdAt: 'desc' as const };
    }
  }
}
