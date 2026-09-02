import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateSellerProductDto } from './dto/create-seller-product.dto.js';
import type { UpdateSellerProductDto } from './dto/update-seller-product.dto.js';

const PRODUCT_INCLUDE = {
  images: { orderBy: { position: 'asc' as const } },
  category: true,
  inventory: true,
} satisfies Prisma.ProductInclude;

const ORDER_INCLUDE = {
  items: { include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' as const } } } } } },
  address: true,
  payment: true,
} satisfies Prisma.OrderInclude;

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSellerByUserId(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new ForbiddenException('No seller profile found for this account');
    return seller;
  }

  async dashboard(userId: string) {
    const seller = await this.getSellerByUserId(userId);

    const [totalProducts, inventories, orderItems] = await Promise.all([
      this.prisma.product.count({ where: { sellerId: seller.id } }),
      this.prisma.inventory.findMany({
        where: { product: { sellerId: seller.id } },
        select: { stockQuantity: true, lowStockThreshold: true },
      }),
      this.prisma.orderItem.findMany({
        where: { product: { sellerId: seller.id } },
        select: { quantity: true, price: true, orderId: true, order: { select: { status: true, userId: true } } },
      }),
    ]);

    const lowStockProducts = inventories.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;
    const nonCancelled = orderItems.filter((item) => item.order.status !== 'CANCELLED');
    const totalRevenue = Math.round(
      nonCancelled.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    );
    const totalOrders = new Set(nonCancelled.map((item) => item.orderId)).size;
    const totalCustomers = new Set(nonCancelled.map((item) => item.order.userId)).size;
    const pendingOrders = new Set(
      orderItems.filter((item) => item.order.status === 'PENDING').map((item) => item.orderId),
    ).size;

    return { totalRevenue, totalOrders, totalProducts, totalCustomers, pendingOrders, lowStockProducts };
  }

  async findProducts(userId: string, query: PaginationQueryDto) {
    const seller = await this.getSellerByUserId(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { sellerId: seller.id },
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where: { sellerId: seller.id } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async createProduct(userId: string, dto: CreateSellerProductDto) {
    const seller = await this.getSellerByUserId(userId);
    const slug = await this.uniqueSlug(dto.name);

    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        discount: dto.discount ?? 0,
        sku: dto.sku,
        brand: dto.brand,
        freeShipping: dto.freeShipping ?? true,
        categoryId: dto.categoryId,
        sellerId: seller.id,
        images: { create: (dto.images ?? []).map((url, position) => ({ url, position })) },
        inventory: { create: { stockQuantity: dto.stockQuantity, lowStockThreshold: 5 } },
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async updateProduct(userId: string, productId: string, dto: UpdateSellerProductDto) {
    const seller = await this.getSellerByUserId(userId);
    const product = await this.getOwnedProduct(seller.id, productId);
    const { stockQuantity, images, ...rest } = dto;

    await this.prisma.product.update({
      where: { id: product.id },
      data: {
        ...rest,
        ...(images && { images: { deleteMany: {}, create: images.map((url, position) => ({ url, position })) } }),
      },
    });

    if (stockQuantity !== undefined) {
      await this.prisma.inventory.update({ where: { productId: product.id }, data: { stockQuantity } });
    }

    return this.prisma.product.findUnique({ where: { id: product.id }, include: PRODUCT_INCLUDE });
  }

  async deleteProduct(userId: string, productId: string) {
    const seller = await this.getSellerByUserId(userId);
    const product = await this.getOwnedProduct(seller.id, productId);
    await this.prisma.product.delete({ where: { id: product.id } });
  }

  async findOrders(userId: string, query: PaginationQueryDto) {
    const seller = await this.getSellerByUserId(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.OrderWhereInput = { items: { some: { product: { sellerId: seller.id } } } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async updateOrderStatus(userId: string, orderId: string, status: OrderStatus) {
    const seller = await this.getSellerByUserId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { product: { sellerId: seller.id } } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.order.update({ where: { id: orderId }, data: { status }, include: ORDER_INCLUDE });
  }

  private async getOwnedProduct(sellerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.sellerId !== sellerId) throw new NotFoundException('Product not found');
    return product;
  }

  private async uniqueSlug(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let slug = base;
    let counter = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return slug;
  }
}
