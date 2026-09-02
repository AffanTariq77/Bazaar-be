import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProduct(productId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total, distribution, product] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where: { productId } }),
      this.prisma.review.groupBy({ by: ['rating'], where: { productId }, _count: true }),
      this.prisma.product.findUnique({ where: { id: productId }, select: { rating: true, reviewCount: true } }),
    ]);

    if (!product) throw new NotFoundException('Product not found');

    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: distribution.find((d) => d.rating === star)?._count ?? 0,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      averageRating: Number(product.rating),
      reviewCount: product.reviewCount,
      ratingDistribution,
    };
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const purchased = await this.prisma.orderItem.findFirst({ where: { productId, order: { userId } } });
    if (!purchased) throw new ForbiddenException('You can only review products you have purchased');

    const existing = await this.prisma.review.findUnique({ where: { productId_userId: { productId, userId } } });
    if (existing) throw new ConflictException('You have already reviewed this product');

    const review = await this.prisma.review.create({
      data: { productId, userId, rating: dto.rating, title: dto.title, comment: dto.comment, verifiedPurchase: true },
      include: { user: { select: { id: true, name: true } } },
    });

    const aggregate = await this.prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: aggregate._avg.rating ?? 0, reviewCount: aggregate._count },
    });

    return review;
  }

  findByUser(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: { take: 1, orderBy: { position: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
