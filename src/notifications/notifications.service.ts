import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  create(userId: string, type: NotificationType, title: string, message: string) {
    return this.prisma.notification.create({ data: { userId, type, title, message } });
  }
}
