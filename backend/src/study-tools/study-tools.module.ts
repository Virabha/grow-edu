import { Module } from '@nestjs/common';

import { BatchesModule } from '../batches/batches.module';
import { DatabaseModule } from '../database/database.module';
import { AnnotationController } from './annotation.controller';
import { AnnotationService } from './annotation.service';
import { LessonBookmarkController } from './lesson-bookmark.controller';
import { LessonBookmarkService } from './lesson-bookmark.service';
import { LessonNoteController } from './lesson-note.controller';
import { LessonNoteService } from './lesson-note.service';
import { VideoBookmarkController } from './video-bookmark.controller';
import { VideoBookmarkService } from './video-bookmark.service';

@Module({
  imports: [DatabaseModule, BatchesModule],
  controllers: [
    VideoBookmarkController,
    LessonNoteController,
    LessonBookmarkController,
    AnnotationController,
  ],
  providers: [
    VideoBookmarkService,
    LessonNoteService,
    LessonBookmarkService,
    AnnotationService,
  ],
})
export class StudyToolsModule {}
