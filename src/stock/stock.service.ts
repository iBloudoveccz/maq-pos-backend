import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // ─── CONSULTAS DE STOCK ───────────────────────────────────────────────────

  /** Stock actual de todos los productos */
  async findAll(search?: string) {
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name:    { contains: search, mode: 'insensitive' } },
        { sku:     { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        unit: true,
        costPrice: true,
        salePrice: true,
        minStock: true,
        category: { select: { name: true } },
        stock: { select: { quantity: true } },
      },
    });

    return products.map((p) => {
      const totalStock = p.stock.reduce((sum, s) => sum + s.quantity, 0);
      return {
        ...p,
        totalStock,
        stockValue: totalStock * p.costPrice,
        isLowStock: totalStock <= (p.minStock ?? 0),
      };
    });
  }

  /** Stock de un producto específico */
  async findOne(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        costPrice: true,
        salePrice: true,
        minStock: true,
        stock: true,
      },
    });

    if (!product) throw new NotFoundException(`Producto ${productId} no encontrado`);

    const totalStock = product.stock.reduce((sum, s) => sum + s.quantity, 0);

    return {
      ...product,
      totalStock,
      stockValue: totalStock * product.costPrice,
      isLowStock: totalStock <= (product.minStock ?? 0),
    };
  }

  /** Resumen de valorización total del inventario */
  async getSummary() {
    const stocks = await this.prisma.stock.findMany({
      include: {
        product: { select: { costPrice: true, salePrice: true, isActive: true } },
      },
    });

    const active = stocks.filter((s) => s.product.isActive);

    const totalCostValue  = active.reduce((sum, s) => sum + s.quantity * s.product.costPrice, 0);
    const totalSaleValue  = active.reduce((sum, s) => sum + s.quantity * s.product.salePrice, 0);
    const totalUnits      = active.reduce((sum, s) => sum + s.quantity, 0);
    const totalProducts   = new Set(active.map((s) => s.productId)).size;

    // Productos con stock bajo
    const lowStockCount = await this.prisma.product.count({
      where: {
        isActive: true,
        stock: { some: { quantity: { lte: 0 } } },
      },
    });

    return {
      totalProducts,
      totalUnits,
      totalCostValue:  parseFloat(totalCostValue.toFixed(2)),
      totalSaleValue:  parseFloat(totalSaleValue.toFixed(2)),
      potentialProfit: parseFloat((totalSaleValue - totalCostValue).toFixed(2)),
      lowStockCount,
    };
  }

  /** Productos con stock bajo o en cero */
  async getLowStock() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        minStock: true,
        costPrice: true,
        category: { select: { name: true } },
        stock: { select: { quantity: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products
      .map((p) => ({
        ...p,
        totalStock: p.stock.reduce((sum, s) => sum + s.quantity, 0),
      }))
      .filter((p) => p.totalStock <= (p.minStock ?? 0));
  }

  // ─── AJUSTE MANUAL ────────────────────────────────────────────────────────

  async adjust(dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { stock: true },
    });

    if (!product) throw new NotFoundException(`Producto ${dto.productId} no encontrado`);

    const currentStock = product.stock.reduce((sum, s) => sum + s.quantity, 0);
    const newStock = currentStock + dto.quantity;

    // No permitir stock negativo en salidas
    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${currentStock}, ajuste solicitado: ${dto.quantity}`
      );
    }

    // Ejecutar en transacción: actualizar stock + registrar movimiento
    return this.prisma.$transaction(async (tx) => {
      // Actualizar o crear registro de stock
      const existingStock = product.stock[0];

      if (existingStock) {
        await tx.stock.update({
          where: { id: existingStock.id },
          data: { quantity: { increment: dto.quantity } },
        });
      } else {
        await tx.stock.create({
          data: {
            productId: dto.productId,
            quantity:  dto.quantity,
          },
        });
      }

      // Registrar movimiento
      const movement = await tx.stockMovement.create({
        data: {
          productId:    dto.productId,
          quantity:     dto.quantity,
          movementType: dto.movementType,
          notes:        dto.notes,
          userId,
          stockBefore:  currentStock,
          stockAfter:   newStock,
        },
      });

      return {
        movement,
        stockBefore: currentStock,
        stockAfter:  newStock,
      };
    });
  }

  // ─── HISTORIAL DE MOVIMIENTOS ─────────────────────────────────────────────

  async getMovements(filters: FilterMovementsDto) {
    const { productId, movementType, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId)    where.productId    = productId;
    if (movementType) where.movementType = movementType;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true, unit: true } },
          user:    { select: { name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
