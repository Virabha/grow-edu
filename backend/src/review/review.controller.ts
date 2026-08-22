import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewQueueQueryDto, CompleteEntryDto } from './dto/review.dto';
import { ReviewItemService } from './review-item.service';
import { DailyQueueService } from './daily-queue.service';

interface AuthedUser {
  userId: string;
}

@ApiTags('review')
@ApiBearerAuth()
@Authenticated()
@Controller('review')
export class ReviewController {
  constructor(
    private readonly reviewItems: ReviewItemService,
    private readonly dailyQueue: DailyQueueService,
  ) {}

  @ApiOperation({ summary: 'Bookmark a question for spaced repetition review' })
  @Post('bookmarks/:questionId')
  addBookmark(
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reviewItems.addBookmark(user.userId, questionId);
  }

  @ApiOperation({ summary: 'Remove a question bookmark' })
  @Delete('bookmarks/:questionId')
  @HttpCode(204)
  removeBookmark(
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reviewItems.removeBookmark(user.userId, questionId);
  }

  @ApiOperation({ summary: "Get or create today's daily review queue" })
  @Get('queue')
  getQueue(
    @Query() query: ReviewQueueQueryDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.dailyQueue.getOrCreate(user.userId, query.batchId);
  }

  @ApiOperation({ summary: 'Complete a queue entry' })
  @Patch('queue/entries/:entryId/complete')
  @HttpCode(200)
  completeEntry(
    @Param('entryId') entryId: string,
    @Body() dto: CompleteEntryDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.dailyQueue.completeEntry(entryId, user.userId, dto.outcome);
  }
}
