import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

const PRODUCT_COUNT = { _count: { select: { products: true } } };

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: { include: PRODUCT_COUNT }, ...PRODUCT_COUNT },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: { include: PRODUCT_COUNT }, ...PRODUCT_COUNT },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
