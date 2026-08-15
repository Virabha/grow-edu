import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilterReviewsDto } from './dto/filter-reviews.dto';
import { InstructorReplyDto } from './dto/instructor-reply.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the caller's own reviews" })
  async getMyReviews(
    @CurrentUser() user: { userId: string },
    @Query() query: FilterReviewsDto,
  ) {
    return this.reviewsService.getMyReviews(
      user.userId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get('reviewable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Courses the caller is enrolled in but has not yet reviewed' })
  async getReviewableCourses(@CurrentUser() user: { userId: string }) {
    return this.reviewsService.getReviewableCourses(user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review for an enrolled course' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 403, description: 'Not enrolled in this course' })
  @ApiResponse({ status: 409, description: 'Already reviewed this course' })
  async createReview(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.userId, dto);
  }

  @Patch(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update caller's own review (resets to PENDING)" })
  async updateReview(
    @CurrentUser() user: { userId: string },
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(reviewId, user.userId, dto);
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft-delete caller's own review" })
  async deleteReview(
    @CurrentUser() user: { userId: string },
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.deleteReview(reviewId, user.userId);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get published reviews for a course' })
  async getPublicReviews(@Query() query: FilterReviewsDto) {
    return this.reviewsService.getPublicReviews(
      query.courseId ?? '',
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Post(':reviewId/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add instructor reply to a review' })
  @ApiResponse({ status: 403, description: 'Not the course instructor' })
  async addInstructorReply(
    @CurrentUser() user: { userId: string },
    @Param('reviewId') reviewId: string,
    @Body() dto: InstructorReplyDto,
  ) {
    return this.reviewsService.addInstructorReply(reviewId, user.userId, dto.reply);
  }
}
