import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryMethod, type Prisma } from '@prisma/client';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CouponsService } from '../coupons/coupons.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

const SHIPPING_FEES: Record<DeliveryMethod, number> = {
  [DeliveryMethod.STANDARD]: 0,
  [DeliveryMethod.EXPRESS]: 300,
};

const ORDER_INCLUDE = {
  items: { include: { product: { include: { images: { orderBy: { position: 'asc' as const } } } } } },
  address: true,
  payment: true,
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const address = await this.prisma.address.findUnique({ where: { id: dto.addressId } });
    if (!address || address.userId !== userId) throw new NotFoundException('Address not found');

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const subtotal = Math.round(
      cart.items.reduce((sum, item) => {
        const price = Number(item.product.price) * (1 - item.product.discount / 100);
        return sum + price * item.quantity;
      }, 0),
    );
    const freeShipping = cart.items.every((item) => item.product.freeShipping);
    const shippingFee = freeShipping ? 0 : SHIPPING_FEES[dto.deliveryMethod];

    let discount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const result = await this.coupons.validate(dto.couponCode, userId, subtotal);
      discount = result.discount;
      couponId = result.coupon.id;
    }

    const total = subtotal - discount + shippingFee;
    const orderNumber = `BZ-${Date.now().toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
    const paid = dto.paymentMethod !== 'COD';

    return this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const result = await tx.inventory.updateMany({
          where: { productId: item.productId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new BadRequestException(`${item.product.name} no longer has enough stock`);
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId,
          deliveryMethod: dto.deliveryMethod,
          subtotal,
          shippingFee,
          discount,
          total,
          couponId,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: Number(item.product.price) * (1 - item.product.discount / 100),
            })),
          },
          payment: {
            create: {
              method: dto.paymentMethod,
              status: paid ? 'PAID' : 'PENDING',
              paidAt: paid ? new Date() : null,
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      if (couponId) {
        await tx.couponUsage.create({ data: { couponId, userId } });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  async findAllForUser(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findById(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order || order.userId !== userId) throw new NotFoundException('Order not found');
    return order;
  }
}
