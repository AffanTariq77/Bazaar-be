import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CartService } from '../cart/cart.service.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CouponsService } from './coupons.service.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly coupons: CouponsService,
    private readonly cart: CartService,
  ) {}

  @Post('validate')
  async validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateCouponDto) {
    const cart = await this.cart.getCart(user.id);
    const { coupon, discount } = await this.coupons.validate(dto.code, user.id, cart.subtotal);
    return { code: coupon.code, discountPercent: coupon.discountPercent, discount };
  }
}
