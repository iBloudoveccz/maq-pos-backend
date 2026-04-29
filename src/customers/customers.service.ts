import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto, FilterCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: FilterCustomerDto) {
    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name:           { contains: search, mode: 'insensitive' } },
        { phone:          { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { email:          { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          // FIX: era 'quotes' → ahora es 'sales'
          _count: { select: { sales: true } },
          loyaltyCard: { select: { cardNumber: true, balance: true, isActive: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        loyaltyCard: true,
        // FIX: era 'quotes' → 'sales', quoteNumber → saleNumber, total → totalAmount
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id:          true,
            saleNumber:  true,   // era quoteNumber
            status:      true,
            totalAmount: true,   // era total
            createdAt:   true,
          },
        },
        _count: { select: { sales: true } },
      },
    });

    if (!customer) throw new NotFoundException(`Cliente ${id} no encontrado`);

    // FIX: era prisma.quote → prisma.sale. Las ventas válidas tienen status VALID
    const totalPurchased = await this.prisma.sale.aggregate({
      where: { customerId: id, status: 'VALID' },
      _sum:  { totalAmount: true },
    });

    return {
      ...customer,
      totalPurchased: Number(totalPurchased._sum.totalAmount ?? 0),
    };
  }

  async findByPhone(phone: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { phone: { contains: phone } },
    });
    if (!customer) throw new NotFoundException(`Cliente con teléfono ${phone} no encontrado`);
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    if (dto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un cliente con el teléfono ${dto.phone}`);
      }
    }

    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    if (dto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un cliente con el teléfono ${dto.phone}`);
      }
    }

    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  /** Historial de compras de un cliente */
  async getHistory(id: string) {
    await this.findOne(id);

    // FIX: era prisma.quote → prisma.sale
    const sales = await this.prisma.sale.findMany({
      where:   { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: {
            productName: true,
            quantity:    true,
            unitPrice:   true,
            totalAmount: true,  // era subtotal
          },
        },
        payments: {
          select: {
            amountApplied: true,  // era amount
            paymentMethod: { select: { name: true } },
            paidAt:        true,
          },
        },
      },
    });

    // FIX: era q.total → Number(s.totalAmount), status PAID → VALID
    const totalPurchased = sales
      .filter((s) => s.status === 'VALID')
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);

    return {
      totalOrders:    sales.length,
      totalPurchased: parseFloat(totalPurchased.toFixed(2)),
      sales,
    };
  }
}
