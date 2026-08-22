import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
} from '@nestjs/common';

import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LessonBookmarkService } from './lesson-bookmark.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@Controller('batches')
export class LessonBookmarkController {
  constructor(private readonly bookmarks: LessonBookmarkService) {}

  @BatchAccess('READ')
  @Put(':batchId/lessons/:lessonId/bookmark')
  upsert(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bookmarks.upsert(batchId, lessonId, user);
  }

  @BatchAccess('READ')
  @Get(':batchId/bookmarks')
  listForBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bookmarks.listForBatch(batchId, user);
  }

  @BatchAccess('READ')
  @Delete(':batchId/lessons/:lessonId/bookmark')
  @HttpCode(204)
  remove(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bookmarks.remove(batchId, lessonId, user);
  }
}
