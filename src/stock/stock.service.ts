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

  /**
   * Consulta desde Product (no desde Stock) para mostrar TODOS los productos
   * aunque aún no tengan registros en la tabla Stock.
   * Retorna el formato StockItem que espera el frontend.
   */
  async findAll(filters?: {
    warehouseId?: string;
    search?: string;
    lowStock?: boolean;
  }) {
    // Filtro base: solo productos activos
    const productWhere: any = { isActive: true };

    if (filters?.search) {
      productWhere.OR = [
        { name:    { contains: filters.search, mode: 'insensitive' } },
        { sku:     { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filtro de almacén aplicado a la relación stock
    const stockWhere: any = filters?.warehouseId
      ? { warehouseId: filters.warehouseId }
      : undefined;

    const products = await this.prisma.product.findMany({
      where:   productWhere,
      orderBy: { name: 'asc' },
      select: {
        id:           true,
        name:         true,
        sku:          true,
        barcode:      true,
        unit:         true,
        costPrice:    true,
        retailPrice:  true,
        mainImageUrl: true,
        category:     { select: { id: true, name: true } },
        stock: {
          where: stockWhere,
          include: {
            warehouse: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    // Obtener almacén por defecto para productos sin stock registrado
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where:   { isActive: true, isBranch: false },
      orderBy: { createdAt: 'asc' },
      select:  { id: true, code: true, name: true },
    });

    // Expandir: un producto con N almacenes → N filas
    // Si no tiene stock, generar una fila con cantidad 0
    const rows: any[] = [];

    for (const p of products) {
      const productInfo = {
        id:           p.id,
        name:         p.name,
        sku:          p.sku,
        barcode:      p.barcode,
        unit:         p.unit,
        costPrice:    Number(p.costPrice),
        retailPrice:  Number(p.retailPrice),
        mainImageUrl: p.mainImageUrl ?? undefined,
        category:     p.category ?? undefined,
      };

      if (p.stock.length === 0) {
        // Producto sin stock: fila con cantidad 0
        const qty = 0;
        if (filters?.lowStock === true && qty > 5) continue; // no aplica filtro lowStock
        rows.push({
          id:          `${p.id}_none`,
          productId:   p.id,
          warehouseId: defaultWarehouse?.id ?? null,
          quantity:    0,
          averageCost: Number(p.costPrice),
          totalValue:  0,
          product:     productInfo,
          warehouse:   defaultWarehouse ?? { id: null, code: '—', name: '—' },
        });
      } else {
        for (const s of p.stock) {
          const qty = Number(s.quantity);
          if (filters?.lowStock && qty > 5) continue;
          rows.push({
            id:          s.id,
            productId:   p.id,
            warehouseId: s.warehouseId,
            quantity:    qty,
            averageCost: Number(s.avgCost   ?? p.costPrice),
            totalValue:  Number(s.stockValue ?? 0),
            product:     productInfo,
            warehouse:   s.warehouse ?? defaultWarehouse,
          });
        }
      }
    }

    return { data: rows, total: rows.length };
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
        retailPrice: true,
        stock:       true,
      },
    });

    if (!product) throw new NotFoundException(`Producto ${productId} no encontrado`);

    const totalStock = product.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
    const totalMin   = product.stock.reduce((sum, s) => sum + Number(s.minStock),  0);

    return {
      ...product,
      totalStock,
      stockValue: totalStock * Number(product.costPrice),
      isLowStock: totalStock <= totalMin,
    };
  }

  /**
   * Resumen ejecutivo para las cards del módulo de inventario.
   * Retorna los campos que espera el frontend: StockSummary.
   */
  async getSummary() {
    const stocks = await this.prisma.stock.findMany({
      include: {
        product: { select: { costPrice: true, retailPrice: true, isActive: true } },
      },
    });

    const active = stocks.filter((s) => s.product?.isActive);

    const totalProducts   = new Set(active.map((s) => s.productId)).size;
    const totalUnits      = active.reduce((sum, s) => sum + Number(s.quantity),   0);
    const totalValue      = active.reduce((sum, s) => sum + Number(s.stockValue ?? 0), 0);
    const lowStockCount   = active.filter(
      (s) => Number(s.quantity) > 0 && Number(s.quantity) <= 5
    ).length;
    const outOfStockCount = active.filter((s) => Number(s.quantity) <= 0).length;

    return {
      totalProducts,
      totalUnits:     parseFloat(totalUnits.toFixed(4)),
      totalValue:     parseFloat(totalValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
    };
  }

  /**
   * Lista todos los almacenes disponibles.
   * Usado por el filtro de almacén en el frontend.
   */
  async getWarehouses() {
    return this.prisma.warehouse.findMany({
      where:   { isActive: true },
      select:  { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
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
        category:  { select: { name: true } },
        stock:     { select: { quantity: true, minStock: true, warehouseId: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products
      .map((p) => ({
        ...p,
        totalStock: p.stock.reduce((sum, s) => sum + Number(s.quantity), 0),
        totalMin:   p.stock.reduce((sum, s) => sum + Number(s.minStock),  0),
      }))
      .filter((p) => p.totalStock <= p.totalMin);
  }

  // ─── AJUSTE MANUAL ────────────────────────────────────────────────────────

  async adjust(dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException(`Producto ${dto.productId} no encontrado`);

    const user = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: { warehouseId: true },
    });
    const warehouseId = user?.warehouseId ?? (await this.getDefaultWarehouseId());

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
          data:  {
            quantity:   { increment: dto.quantity },
            stockValue: newQty * Number(product.costPrice),
          },
        });
      } else {
        await tx.stock.create({
          data: {
            productId: dto.productId,
            warehouseId,
            quantity:   dto.quantity,
            avgCost:    Number(product.costPrice),
            stockValue: dto.quantity * Number(product.costPrice),
          },
        });
      }

      const isPositive = dto.quantity > 0;
      const movement = await tx.stockMovement.create({
        data: {
          productId:    dto.productId,
          warehouseId,
          movementType: (dto.movementType as MovementType) ?? MovementType.ADJUSTMENT,
          quantityIn:   isPositive ? dto.quantity       : 0,
          quantityOut:  isPositive ? 0 : Math.abs(dto.quantity),
          balanceQty:   newQty,
          unitCost:     Number(product.costPrice),
          totalValue:   newQty * Number(product.costPrice),
          notes:        dto.notes,
          createdById:  userId,
        },
      });

      return {
        movement,
        stockBefore: currentQty,
        stockAfter:  newQty,
      };
    });
  }

  // ─── HISTORIAL DE MOVIMIENTOS ─────────────────────────────────────────────

  async getMovements(filters: FilterMovementsDto) {
    const { productId, movementType, dateFrom, dateTo, page = 1, limit = 30 } = filters;
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
          warehouse: { select: { id: true, name: true, code: true } },
          createdBy: { select: { name: true, code: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    // Mapear al formato que espera el frontend (StockMovement)
    return {
      data: items.map((m) => ({
        id:          m.id,
        type:        m.movementType,
        quantity:    Number(m.quantityIn) - Number(m.quantityOut),
        costPrice:   Number(m.unitCost   ?? 0),
        totalValue:  Number(m.totalValue ?? 0),
        referenceId: m.documentRef ?? undefined,
        notes:       m.notes      ?? undefined,
        createdAt:   m.createdAt.toISOString(),
        product:     m.product,
        warehouse:   m.warehouse,
        user:        m.createdBy
          ? { id: m.createdBy.code, name: m.createdBy.name }
          : undefined,
      })),
      total,
      page,
      limit,
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
