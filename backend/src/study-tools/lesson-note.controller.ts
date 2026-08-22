import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
} from '@nestjs/common';

import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpsertLessonNoteDto } from './dto/upsert-lesson-note.dto';
import { LessonNoteService } from './lesson-note.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@Controller('batches')
export class LessonNoteController {
  constructor(private readonly notes: LessonNoteService) {}

  @BatchAccess('READ')
  @Put(':batchId/lessons/:lessonId/note')
  upsert(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
    @Body() dto: UpsertLessonNoteDto,
  ) {
    return this.notes.upsert(batchId, lessonId, user, dto);
  }

  @BatchAccess('READ')
  @Get(':batchId/lessons/:lessonId/note')
  get(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.notes.get(batchId, lessonId, user);
  }

  @BatchAccess('READ')
  @Delete(':batchId/lessons/:lessonId/note')
  @HttpCode(204)
  remove(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.notes.remove(batchId, lessonId, user);
  }

  @BatchAccess('READ')
  @Get(':batchId/notes/export')
  exportForBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.notes.exportForBatch(batchId, user);
  }
}
