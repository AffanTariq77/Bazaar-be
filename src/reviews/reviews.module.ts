import { Module } from '@nestjs/common';
import { MyReviewsController } from './my-reviews.controller.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  controllers: [MyReviewsController, ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
