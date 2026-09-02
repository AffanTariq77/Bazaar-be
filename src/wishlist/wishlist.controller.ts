import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { WishlistService } from './wishlist.service.js';

class MoveToCartDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser() user: AuthUser) {
    return this.wishlist.getWishlist(user.id);
  }

  @Post(':productId')
  add(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.wishlist.add(user.id, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.wishlist.remove(user.id, productId);
  }

  @Post(':productId/move-to-cart')
  moveToCart(@CurrentUser() user: AuthUser, @Param('productId') productId: string, @Body() dto: MoveToCartDto) {
    return this.wishlist.moveToCart(user.id, productId, dto.quantity ?? 1);
  }
}
