import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateSellerProductDto } from './dto/create-seller-product.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { UpdateSellerProductDto } from './dto/update-seller-product.dto.js';
import { SellersService } from './sellers.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@Controller('seller')
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.sellers.dashboard(user.id);
  }

  @Get('products')
  findProducts(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.sellers.findProducts(user.id, query);
  }

  @Get('products/:id')
  findProduct(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sellers.findProduct(user.id, id);
  }

  @Post('products')
  createProduct(@CurrentUser() user: AuthUser, @Body() dto: CreateSellerProductDto) {
    return this.sellers.createProduct(user.id, dto);
  }

  @Patch('products/:id')
  updateProduct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSellerProductDto) {
    return this.sellers.updateProduct(user.id, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sellers.deleteProduct(user.id, id);
  }

  @Get('orders')
  findOrders(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.sellers.findOrders(user.id, query);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.sellers.updateOrderStatus(user.id, id, dto.status);
  }
}
