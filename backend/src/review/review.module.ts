import { Module } from '@nestjs/common';

import { PracticeModule } from '../assessment/practice/practice.module';
import { SchedulerService } from './scheduler.service';
import { ReviewItemService } from './review-item.service';
import { DailyQueueService } from './daily-queue.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [PracticeModule],
  controllers: [ReviewController],
  providers: [SchedulerService, ReviewItemService, DailyQueueService],
})
export class ReviewModule {}
