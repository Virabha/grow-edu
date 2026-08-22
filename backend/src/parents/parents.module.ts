import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ParentLinkController } from './parent-link.controller';
import { ParentLinkService } from './parent-link.service';
import { ParentViewController } from './parent-view.controller';
import { ParentViewService } from './parent-view.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ParentLinkController, ParentViewController],
  providers: [ParentLinkService, ParentViewService],
})
export class ParentsModule {}
