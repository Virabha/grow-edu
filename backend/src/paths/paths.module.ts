import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { PathEnrolmentController } from './path-enrolment.controller';
import { PathEnrolmentService } from './path-enrolment.service';
import { PathProgressController } from './path-progress.controller';
import { PathProgressService } from './path-progress.service';
import { PathStagesService } from './path-stages.service';
import { PathsController } from './paths.controller';
import { PathsService } from './paths.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PathEnrolmentController, PathProgressController, PathsController],
  providers: [PathsService, PathStagesService, PathEnrolmentService, PathProgressService],
})
export class PathsModule {}
