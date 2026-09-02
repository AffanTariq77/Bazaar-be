import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import type { ProductQueryDto } from './dto/product-query.dto.js';

const PRODUCT_INCLUDE = {
  images: { orderBy: { position: 'asc' as const } },
  category: true,
  seller: true,
  inventory: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.category && { category: { slug: query.category } }),
      ...(query.brand && { brand: { equals: query.brand, mode: 'insensitive' } }),
      ...(query.minRating !== undefined && { rating: { gte: query.minRating } }),
      ...(query.minDiscount !== undefined && { discount: { gte: query.minDiscount } }),
      ...(query.freeShipping !== undefined && { freeShipping: query.freeShipping }),
      ...(query.inStock && { inventory: { stockQuantity: { gt: 0 } } }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        price: {
          ...(query.minPrice !== undefined && { gte: query.minPrice }),
          ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
        },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { brand: { contains: query.search, mode: 'insensitive' } },
          { category: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const orderBy = this.resolveSort(query.sort);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_INCLUDE,
    });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not found');
    return product;
  }

  searchSuggestions(term: string) {
    if (!term.trim()) return Promise.resolve([]);
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE', name: { contains: term, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
      take: 8,
      orderBy: { reviewCount: 'desc' },
    });
  }

  private resolveSort(sort?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'rating':
        return { rating: 'desc' };
      case 'newest':
        return { createdAt: 'desc' };
      default:
        return { reviewCount: 'desc' };
    }
  }
}
