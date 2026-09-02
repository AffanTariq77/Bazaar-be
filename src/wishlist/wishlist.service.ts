import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CartService } from '../cart/cart.service.js';
import { PrismaService } from '../database/prisma.service.js';

const WISHLIST_INCLUDE = {
  items: {
    include: {
      product: {
        include: { images: { orderBy: { position: 'asc' as const } }, inventory: true, seller: true },
      },
    },
  },
} satisfies Prisma.WishlistInclude;

type WishlistWithItems = Prisma.WishlistGetPayload<{ include: typeof WISHLIST_INCLUDE }>;

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
  ) {}

  async getWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    return wishlist.items.map((item) => item.product);
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      create: { wishlistId: wishlist.id, productId },
      update: {},
    });
    return this.getWishlist(userId);
  }

  async remove(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    return this.getWishlist(userId);
  }

  async moveToCart(userId: string, productId: string, quantity: number) {
    const cart = await this.cart.addItem(userId, productId, quantity);
    await this.remove(userId, productId);
    return cart;
  }

  private async getOrCreateWishlist(userId: string): Promise<WishlistWithItems> {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId }, include: WISHLIST_INCLUDE });
    if (wishlist) return wishlist;
    return this.prisma.wishlist.create({ data: { userId }, include: WISHLIST_INCLUDE });
  }
}
