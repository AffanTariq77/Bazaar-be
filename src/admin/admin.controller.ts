import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AdminService } from './admin.service.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  findUsers(@Query() query: PaginationQueryDto) {
    return this.admin.findUsers(query);
  }

  @Get('sellers')
  findSellers(@Query() query: PaginationQueryDto) {
    return this.admin.findSellers(query);
  }

  @Get('products')
  findProducts(@Query() query: PaginationQueryDto) {
    return this.admin.findProducts(query);
  }

  @Get('orders')
  findOrders(@Query() query: PaginationQueryDto) {
    return this.admin.findOrders(query);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.admin.updateOrderStatus(id, dto.status);
  }

  @Get('categories')
  findCategories() {
    return this.admin.findCategories();
  }
}
