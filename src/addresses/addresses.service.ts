import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateAddressDto } from './dto/create-address.dto.js';
import type { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) await this.clearDefault(userId);
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const address = await this.getOwned(userId, id);
    if (dto.isDefault) await this.clearDefault(userId);
    return this.prisma.address.update({ where: { id: address.id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const address = await this.getOwned(userId, id);
    await this.prisma.address.delete({ where: { id: address.id } });
  }

  private clearDefault(userId: string) {
    return this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  private async getOwned(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) throw new NotFoundException('Address not found');
    return address;
  }
}
