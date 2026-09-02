import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateCouponDto } from './dto/create-coupon.dto.js';
import type { UpdateCouponDto } from './dto/update-coupon.dto.js';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateCouponDto) {
    const code = dto.code.toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new ConflictException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        code,
        discountPercent: dto.discountPercent,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        expiresAt: new Date(dto.expiresAt),
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.getById(id);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.code && { code: dto.code.toUpperCase() }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.coupon.delete({ where: { id } });
  }

  async validate(code: string, userId: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new BadRequestException('Invalid coupon code');
    if (coupon.expiresAt < new Date()) throw new BadRequestException('Coupon has expired');
    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount for this coupon is Rs. ${coupon.minOrderAmount}`);
    }

    const usageCount = await this.prisma.couponUsage.count({ where: { couponId: coupon.id } });
    if (usageCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');

    const alreadyUsed = await this.prisma.couponUsage.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (alreadyUsed) throw new BadRequestException('You have already used this coupon');

    const discount = Math.min(
      Math.round(subtotal * (coupon.discountPercent / 100)),
      Number(coupon.maxDiscount),
    );
    return { coupon, discount };
  }

  private async getById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }
}
