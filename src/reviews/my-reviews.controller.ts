import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { ReviewsService } from './reviews.service.js';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class MyReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.reviews.findByUser(user.id);
  }
}
