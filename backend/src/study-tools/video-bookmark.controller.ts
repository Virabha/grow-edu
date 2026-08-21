import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';

import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateVideoBookmarkDto } from './dto/create-video-bookmark.dto';
import { VideoBookmarkService } from './video-bookmark.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@Controller('batches')
export class VideoBookmarkController {
  constructor(private readonly bookmarks: VideoBookmarkService) {}

  @BatchAccess('READ')
  @Post(':batchId/lessons/:lessonId/video-bookmarks')
  create(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
    @Body() dto: CreateVideoBookmarkDto,
  ) {
    return this.bookmarks.create(batchId, lessonId, user, dto);
  }

  @BatchAccess('READ')
  @Get(':batchId/lessons/:lessonId/video-bookmarks')
  listForLesson(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bookmarks.listForLesson(batchId, lessonId, user);
  }

  @BatchAccess('READ')
  @Get(':batchId/video-bookmarks')
  listForBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bookmarks.listForBatch(batchId, user);
  }

  @BatchAccess('READ')
  @Delete(':batchId/video-bookmarks/:bookmarkId')
  @HttpCode(204)
  remove(
    @Param('batchId') batchId: string,
    @Param('bookmarkId') bookmarkId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bookmarks.remove(batchId, bookmarkId, user);
  }
}
