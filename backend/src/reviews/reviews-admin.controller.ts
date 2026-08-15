import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { FilterAdminReviewsDto } from './dto/filter-admin-reviews.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('admin/reviews')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class ReviewsAdminController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list reviews filterable by status and courseId' })
  async findAll(@Query() query: FilterAdminReviewsDto) {
    return this.reviewsService.getAdminReviews({
      status: query.status,
      courseId: query.courseId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Patch(':reviewId/status')
  @ApiOperation({ summary: 'Admin: publish or reject a review' })
  @ApiResponse({ status: 200, description: 'Review moderated' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async moderateReview(
    @CurrentUser() user: { userId: string },
    @Param('reviewId') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateReview(reviewId, user.userId, dto.status);
  }
}
