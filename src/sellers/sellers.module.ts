import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SellersController } from './sellers.controller.js';
import { SellersService } from './sellers.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [SellersController],
  providers: [SellersService],
})
export class SellersModule {}
