import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  findAll(@Param('productId') productId: string, @Query() query: PaginationQueryDto) {
    return this.reviews.findForProduct(productId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Param('productId') productId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, productId, dto);
  }
}
