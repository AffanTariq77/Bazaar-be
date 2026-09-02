import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module.js';
import { AdminCouponsController } from './admin-coupons.controller.js';
import { CouponsController } from './coupons.controller.js';
import { CouponsService } from './coupons.service.js';

@Module({
  imports: [CartModule],
  controllers: [AdminCouponsController, CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
