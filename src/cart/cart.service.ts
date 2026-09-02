import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

const CART_INCLUDE = {
  items: {
    include: {
      product: {
        include: { images: { orderBy: { position: 'asc' as const } }, inventory: true, seller: true },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    return this.serialize(await this.getOrCreateCart(userId));
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { inventory: true } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not found');

    const cart = await this.getOrCreateCart(userId);
    const existing = cart.items.find((item) => item.productId === productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    const stock = product.inventory?.stockQuantity ?? 0;
    if (nextQuantity > stock) {
      throw new BadRequestException(`Only ${stock} unit(s) of this product are available`);
    }

    if (existing) {
      await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
    } else {
      await this.prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: nextQuantity } });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: { include: { inventory: true } } },
    });
    if (!item || item.cart.userId !== userId) throw new NotFoundException('Cart item not found');

    const stock = item.product.inventory?.stockQuantity ?? 0;
    if (quantity > stock) throw new BadRequestException(`Only ${stock} unit(s) of this product are available`);

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
    if (!item || item.cart.userId !== userId) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  private async getOrCreateCart(userId: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
    if (cart) return cart;
    return this.prisma.cart.create({ data: { userId }, include: CART_INCLUDE });
  }

  private serialize(cart: CartWithItems) {
    const items = cart.items.map((item) => ({ id: item.id, quantity: item.quantity, product: item.product }));
    const subtotal = items.reduce((sum, item) => {
      const price = Number(item.product.price) * (1 - item.product.discount / 100);
      return sum + price * item.quantity;
    }, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return { id: cart.id, items, subtotal: Math.round(subtotal), itemCount };
  }
}
