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
          _count: { select: { quotes: true } },
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
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        _count: { select: { quotes: true } },
      },
    });

    if (!customer) throw new NotFoundException(`Cliente ${id} no encontrado`);

    // Calcular total comprado (solo cotizaciones pagadas)
    const totalPurchased = await this.prisma.quote.aggregate({
      where: { customerId: id, status: 'PAID' },
      _sum: { total: true },
    });

    return {
      ...customer,
      totalPurchased: totalPurchased._sum.total ?? 0,
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
    // Verificar teléfono único
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un cliente con el teléfono ${dto.phone}`);
    }

    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    // Verificar teléfono único si cambia
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

    const quotes = await this.prisma.quote.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
        payments: {
          select: {
            amount: true,
            paymentMethod: { select: { name: true } },
            createdAt: true,
          },
        },
      },
    });

    const totalPurchased = quotes
      .filter((q) => q.status === 'PAID')
      .reduce((sum, q) => sum + q.total, 0);

    return {
      totalOrders: quotes.length,
      totalPurchased: parseFloat(totalPurchased.toFixed(2)),
      quotes,
    };
  }
}
