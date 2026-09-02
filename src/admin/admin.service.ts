import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PrismaService } from '../database/prisma.service.js';

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function bucketCountByDay(dates: Date[], days: string[]) {
  const buckets = new Map(days.map((d) => [d, 0]));
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return days.map((day) => ({ day, value: buckets.get(day) ?? 0 }));
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const [totalUsers, totalSellers, totalProducts, orders, recentOrders, recentUsers, categories, orderItems] =
      await Promise.all([
        this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
        this.prisma.user.count({ where: { role: Role.SELLER } }),
        this.prisma.product.count(),
        this.prisma.order.findMany({ select: { total: true, status: true } }),
        this.prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, total: true } }),
        this.prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        this.prisma.category.findMany({
          where: { parentId: null },
          include: { _count: { select: { products: true } } },
        }),
        this.prisma.orderItem.findMany({
          select: { quantity: true, price: true, product: { select: { id: true, name: true } } },
        }),
      ]);

    const totalRevenue = Math.round(
      orders.filter((o) => o.status !== OrderStatus.CANCELLED).reduce((sum, o) => sum + Number(o.total), 0),
    );
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING).length;

    const days = lastNDays(7);
    const revenueBuckets = new Map(days.map((d) => [d, 0]));
    for (const order of recentOrders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (revenueBuckets.has(key)) revenueBuckets.set(key, (revenueBuckets.get(key) ?? 0) + Number(order.total));
    }
    const revenueByDay = days.map((day) => ({ day, value: Math.round(revenueBuckets.get(day) ?? 0) }));
    const ordersByDay = bucketCountByDay(
      recentOrders.map((o) => o.createdAt),
      days,
    );
    const usersByDay = bucketCountByDay(
      recentUsers.map((u) => u.createdAt),
      days,
    );

    const topCategories = [...categories]
      .sort((a, b) => b._count.products - a._count.products)
      .slice(0, 5)
      .map((c) => ({ name: c.name, value: c._count.products }));

    const productRevenue = new Map<string, { name: string; value: number }>();
    for (const item of orderItems) {
      const entry = productRevenue.get(item.product.id) ?? { name: item.product.name, value: 0 };
      entry.value += Number(item.price) * item.quantity;
      productRevenue.set(item.product.id, entry);
    }
    const topProducts = [...productRevenue.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((p) => ({ name: p.name, value: Math.round(p.value) }));

    return {
      totalRevenue,
      totalOrders,
      totalUsers,
      totalSellers,
      totalProducts,
      pendingOrders,
      charts: { revenueByDay, ordersByDay, usersByDay, topCategories, topProducts },
    };
  }

  async findUsers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findSellers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.seller.findMany({
        include: { user: { select: { name: true, email: true } }, _count: { select: { products: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.seller.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findProducts(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        include: {
          images: { take: 1, orderBy: { position: 'asc' } },
          category: true,
          seller: { select: { storeName: true } },
          inventory: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findOrders(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        include: { user: { select: { name: true, email: true } }, payment: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id: orderId }, data: { status } });
  }

  findCategories() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: { include: { _count: { select: { products: true } } } }, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
