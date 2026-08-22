import { Module } from '@nestjs/common';

import { BatchesModule } from '../batches/batches.module';
import { DatabaseModule } from '../database/database.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { StudyGroupController } from './study-group.controller';
import { StudyGroupService } from './study-group.service';

@Module({
  imports: [DatabaseModule, BatchesModule],
  controllers: [FeedController, StudyGroupController, ModerationController],
  providers: [FeedService, StudyGroupService, ModerationService],
})
export class CommunityModule {}
