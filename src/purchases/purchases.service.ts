import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FilterPurchaseDto, CreateSupplierDto } from './dto/filter-purchase.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  // ─── PROVEEDORES ──────────────────────────────────────────────────────────

  async findAllSuppliers(search?: string) {
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { code:  { contains: search, mode: 'insensitive' } },
        { ruc:   { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchases: true } } },
    });
  }

  async createSupplier(dto: CreateSupplierDto) {
    // Verificar código único
    const existing = await this.prisma.supplier.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un proveedor con el código ${dto.code}`);
    }
    return this.prisma.supplier.create({ data: dto });
  }

  async updateSupplier(id: string, dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Proveedor ${id} no encontrado`);

    // Si cambia el código verificar unicidad
    if (dto.code && dto.code !== supplier.code) {
      const existing = await this.prisma.supplier.findUnique({ where: { code: dto.code } });
      if (existing) throw new BadRequestException(`El código ${dto.code} ya está en uso`);
    }

    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  // ─── COMPRAS ──────────────────────────────────────────────────────────────

  async findAll(filters: FilterPurchaseDto) {
    const { supplierId, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;

    if (search) {
      where.OR = [
        { documentNumber:  { contains: search, mode: 'insensitive' } },
        { supplierInvoice: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.purchaseDate = {};
      if (dateFrom) where.purchaseDate.gte = new Date(dateFrom);
      if (dateTo)   where.purchaseDate.lte = new Date(dateTo + 'T23:59:59');
    }

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier:  { select: { id: true, name: true, code: true } },
          warehouse: { select: { id: true, name: true } },
          // FIX: 'receivedBy' no existe en Purchase → quitado
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier:  true,
        warehouse: { select: { id: true, name: true, code: true } },
        // FIX: quitado 'receivedBy' que no existe
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });
    if (!purchase) throw new NotFoundException(`Compra ${id} no encontrada`);
    return purchase;
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    // Verificar proveedor
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException(`Proveedor ${dto.supplierId} no encontrado`);

    // Obtener almacén del usuario o usar almacén principal
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true },
    });
    const warehouseId = user?.warehouseId ?? await this.getDefaultWarehouseId();

    // Verificar productos
    const productIds = dto.items.map((i) => i.productId);
    const products   = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no existen');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calcular totales
    // FIX: usar totalCost = quantity × unitCost (no subtotal/salePrice)
    const itemsData = dto.items.map((item) => ({
      productId:    item.productId,
      quantity:     item.quantity,
      unitCost:     item.unitCost,
      previousCost: Number(productMap.get(item.productId)!.costPrice), // Oldjhj
      retailPrice:  item.retailPrice ?? 0,   // FIX: era salePrice → retailPrice
      totalCost:    item.quantity * item.unitCost,
      taxRate:      0,
      taxAmount:    0,
    }));

    const subtotal    = itemsData.reduce((sum, i) => sum + i.totalCost, 0);
    const taxAmount   = dto.taxAmount ?? 0;  // FIX: era dto.tax → dto.taxAmount
    const totalAmount = subtotal + taxAmount;

    const documentNumber = await this.generateDocumentNumber();

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la compra
      const purchase = await tx.purchase.create({
        data: {
          documentNumber,
          supplierId:     dto.supplierId,
          warehouseId,
          supplierInvoice: dto.supplierInvoice,
          subtotal,
          taxAmount,
          totalAmount,
          notes:          dto.notes,
          status:         'PENDING',
          createdById:    userId,
          items: { create: itemsData },
        },
        include: {
          supplier: { select: { name: true } },
          items:    true,
        },
      });

      // 2. Por cada ítem: actualizar stock y registrar movimiento
      for (const item of dto.items) {
        const product    = productMap.get(item.productId)!;
        const totalCost  = item.quantity * item.unitCost;

        // Obtener stock actual en este almacén
        const existingStock = await tx.stock.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
        });

        const qtyBefore  = Number(existingStock?.quantity ?? 0);
        const qtyAfter   = qtyBefore + item.quantity;

        // Calcular nuevo costo promedio ponderado
        const currentValue = qtyBefore * Number(existingStock?.avgCost ?? item.unitCost);
        const newValue     = currentValue + totalCost;
        const newAvgCost   = qtyAfter > 0 ? newValue / qtyAfter : item.unitCost;

        if (existingStock) {
          await tx.stock.update({
            where: { productId_warehouseId: { productId: item.productId, warehouseId } },
            data:  {
              quantity:   { increment: item.quantity },
              // FIX: stockValue = quantity × avgCost
              stockValue: qtyAfter * newAvgCost,
              avgCost:    newAvgCost,
            },
          });
        } else {
          // FIX: Stock requiere warehouseId (@@unique([productId, warehouseId]))
          await tx.stock.create({
            data: {
              productId:  item.productId,   // FIX: era variable 'productId' sin definir
              warehouseId,
              quantity:   item.quantity,
              stockValue: totalCost,
              avgCost:    item.unitCost,
            },
          });
        }

        // FIX: StockMovement usa quantityIn/quantityOut/balanceQty, no quantity/stockBefore/stockAfter
        await tx.stockMovement.create({
          data: {
            productId:    item.productId,
            warehouseId,
            movementType: MovementType.PURCHASE,
            quantityIn:   item.quantity,   // FIX: era 'quantity'
            quantityOut:  0,
            balanceQty:   qtyAfter,
            unitCost:     item.unitCost,
            totalValue:   qtyAfter * newAvgCost,
            documentRef:  documentNumber,
            createdById:  userId,
          },
        });

        // Actualizar costo promedio en el producto
        await tx.product.update({
          where: { id: item.productId },
          data:  {
            costPrice: newAvgCost,
            // FIX: era salePrice → retailPrice
            ...(item.retailPrice && { retailPrice: item.retailPrice }),
          },
        });
      }

      // 3. Marcar como completada
      return tx.purchase.update({
        where: { id: purchase.id },
        data:  { status: 'COMPLETED' },
        include: {
          supplier: { select: { id: true, name: true } },
          items:    true,
        },
      });
    });
  }

  // ─── RESUMEN ──────────────────────────────────────────────────────────────

  async getSummary() {
    const now      = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthTotal, supplierCount, topSuppliers] = await Promise.all([
      this.prisma.purchase.aggregate({
        where:  { purchaseDate: { gte: firstDay } },
        // FIX: era 'total' → 'totalAmount'
        _sum:   { totalAmount: true },
        _count: true,
      }),
      this.prisma.supplier.count({ where: { isActive: true } }),
      this.prisma.purchase.groupBy({
        by:      ['supplierId'],
        // FIX: era 'total' → 'totalAmount'
        _sum:    { totalAmount: true },
        _count:  true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take:    5,
      }),
    ]);

    const supplierIds = topSuppliers.map((s) => s.supplierId);
    const suppliers   = await this.prisma.supplier.findMany({
      where:  { id: { in: supplierIds } },
      select: { id: true, name: true, code: true },
    });
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    return {
      thisMonth: {
        // FIX: era ._sum.total → ._sum.totalAmount
        totalSpent:  Number(monthTotal._sum.totalAmount ?? 0),
        totalOrders: monthTotal._count,
      },
      totalSuppliers: supplierCount,
      topSuppliers: topSuppliers.map((s) => ({
        supplierId:   s.supplierId,
        supplierName: supplierMap.get(s.supplierId)?.name ?? 'Desconocido',
        supplierCode: supplierMap.get(s.supplierId)?.code ?? '',
        // FIX: era ._sum.total → ._sum.totalAmount
        totalSpent:   Number(s._sum.totalAmount ?? 0),
        totalOrders:  s._count,
      })),
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private async getDefaultWarehouseId(): Promise<string> {
    const wh = await this.prisma.warehouse.findFirst({
      where: { isActive: true, isBranch: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!wh) throw new BadRequestException('No hay almacén configurado en el sistema');
    return wh.id;
  }

  private async generateDocumentNumber(): Promise<string> {
    const count = await this.prisma.purchase.count();
    const seq   = String(count + 1).padStart(6, '0');
    const date  = new Date();
    const yy    = String(date.getFullYear()).slice(2);
    const mm    = String(date.getMonth() + 1).padStart(2, '0');
    const dd    = String(date.getDate()).padStart(2, '0');
    return `PH${yy}${mm}${dd}01${seq}`; // formato S12: PH{AA}{MM}{DD}{Posid}{seq}
  }
}
