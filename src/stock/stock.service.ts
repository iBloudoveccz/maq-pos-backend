import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // ─── CONSULTAS DE STOCK ───────────────────────────────────────────────────

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
        id:         true,
        name:       true,
        sku:        true,
        barcode:    true,
        unit:       true,
        costPrice:  true,
        retailPrice: true,   // FIX: era salePrice → retailPrice
        // FIX: minStock ya NO está en Product, está en Stock por almacén
        category:   { select: { name: true } },
        stock:      { select: { quantity: true, minStock: true, warehouseId: true } },
      },
    });

    return products.map((p) => {
      // FIX: Decimal → Number() antes de operar
      const totalStock  = p.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
      const totalMin    = p.stock.reduce((sum, s) => sum + Number(s.minStock), 0);
      return {
        ...p,
        totalStock,
        stockValue: totalStock * Number(p.costPrice),
        isLowStock: totalStock <= totalMin,
      };
    });
  }

  async findOne(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id:          true,
        name:        true,
        sku:         true,
        unit:        true,
        costPrice:   true,
        retailPrice: true,   // FIX: era salePrice
        // FIX: minStock está en Stock, no en Product
        stock:       true,
      },
    });

    if (!product) throw new NotFoundException(`Producto ${productId} no encontrado`);

    const totalStock = product.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
    const totalMin   = product.stock.reduce((sum, s) => sum + Number(s.minStock), 0);

    return {
      ...product,
      totalStock,
      stockValue: totalStock * Number(product.costPrice),
      isLowStock: totalStock <= totalMin,
    };
  }

  async getSummary() {
    // FIX: incluir product con los campos correctos
    const stocks = await this.prisma.stock.findMany({
      include: {
        product: { select: { costPrice: true, retailPrice: true, isActive: true } },
      },
    });

    const active = stocks.filter((s) => s.product.isActive);

    // FIX: Decimal → Number() en todas las operaciones aritméticas
    const totalCostValue = active.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.product.costPrice), 0
    );
    const totalSaleValue = active.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.product.retailPrice), 0  // FIX: salePrice→retailPrice
    );
    const totalUnits    = active.reduce((sum, s) => sum + Number(s.quantity), 0);
    const totalProducts = new Set(active.map((s) => s.productId)).size;

    const lowStockCount = await this.prisma.stock.count({
      where: { quantity: { lte: 0 } },
    });

    return {
      totalProducts,
      totalUnits:      parseFloat(totalUnits.toFixed(4)),
      totalCostValue:  parseFloat(totalCostValue.toFixed(2)),
      totalSaleValue:  parseFloat(totalSaleValue.toFixed(2)),
      potentialProfit: parseFloat((totalSaleValue - totalCostValue).toFixed(2)),
      lowStockCount,
    };
  }

  async getLowStock() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id:       true,
        name:     true,
        sku:      true,
        unit:     true,
        costPrice: true,
        category: { select: { name: true } },
        // FIX: minStock está en stock, no en product
        stock:    { select: { quantity: true, minStock: true, warehouseId: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products
      .map((p) => ({
        ...p,
        totalStock: p.stock.reduce((sum, s) => sum + Number(s.quantity), 0),
        totalMin:   p.stock.reduce((sum, s) => sum + Number(s.minStock), 0),
      }))
      .filter((p) => p.totalStock <= p.totalMin);
  }

  // ─── AJUSTE MANUAL ────────────────────────────────────────────────────────

  async adjust(dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException(`Producto ${dto.productId} no encontrado`);

    // Obtener almacén del usuario o el principal
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true },
    });
    const warehouseId = user?.warehouseId ?? await this.getDefaultWarehouseId();

    // FIX: Stock tiene @@unique([productId, warehouseId])
    const existingStock = await this.prisma.stock.findUnique({
      where: { productId_warehouseId: { productId: dto.productId, warehouseId } },
    });

    const currentQty = Number(existingStock?.quantity ?? 0);
    const newQty     = currentQty + dto.quantity;

    if (newQty < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${currentQty}, ajuste: ${dto.quantity}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (existingStock) {
        await tx.stock.update({
          where: { productId_warehouseId: { productId: dto.productId, warehouseId } },
          data:  { quantity: { increment: dto.quantity } },
        });
      } else {
        // FIX: Stock requiere warehouseId
        await tx.stock.create({
          data: {
            productId:  dto.productId,
            warehouseId,
            quantity:   dto.quantity,
            avgCost:    Number(product.costPrice),
            stockValue: dto.quantity * Number(product.costPrice),
          },
        });
      }

      // FIX: StockMovement usa quantityIn/quantityOut/balanceQty, no quantity/stockBefore/stockAfter
      // FIX: movementType debe ser del enum MovementType, no string
      const isPositive = dto.quantity > 0;
      const movement = await tx.stockMovement.create({
        data: {
          productId:    dto.productId,
          warehouseId,
          // FIX: era string → ahora es MovementType enum
          movementType: (dto.movementType as MovementType) ?? MovementType.ADJUSTMENT,
          quantityIn:   isPositive ? dto.quantity : 0,
          quantityOut:  isPositive ? 0 : Math.abs(dto.quantity),
          balanceQty:   newQty,
          unitCost:     Number(product.costPrice),
          totalValue:   newQty * Number(product.costPrice),
          notes:        dto.notes,
          createdById:  userId,  // FIX: era userId → createdById
        },
      });

      return { movement, stockBefore: currentQty, stockAfter: newQty };
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
          product:   { select: { name: true, sku: true, unit: true } },
          // FIX: era 'user' → 'createdBy'
          createdBy: { select: { name: true, code: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private async getDefaultWarehouseId(): Promise<string> {
    const wh = await this.prisma.warehouse.findFirst({
      where:   { isActive: true, isBranch: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!wh) throw new BadRequestException('No hay almacén configurado');
    return wh.id;
  }
}
