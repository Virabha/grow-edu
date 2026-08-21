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
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { ReconcileAnnotationsDto } from './dto/reconcile-annotations.dto';
import { AnnotationService } from './annotation.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@Controller('batches')
export class AnnotationController {
  constructor(private readonly annotations: AnnotationService) {}

  @BatchAccess('READ')
  @Post(':batchId/lessons/:lessonId/annotations')
  create(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
    @Body() dto: CreateAnnotationDto,
  ) {
    return this.annotations.create(batchId, lessonId, user, dto);
  }

  @BatchAccess('READ')
  @Get(':batchId/lessons/:lessonId/annotations')
  list(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.annotations.list(batchId, lessonId, user);
  }

  @BatchAccess('READ')
  @Post(':batchId/lessons/:lessonId/annotations/reconcile')
  reconcile(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
    @Body() dto: ReconcileAnnotationsDto,
  ) {
    return this.annotations.reconcile(batchId, lessonId, user, dto);
  }

  @BatchAccess('READ')
  @Delete(':batchId/lessons/:lessonId/annotations/:annotationId')
  @HttpCode(204)
  remove(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @Param('annotationId') annotationId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.annotations.remove(batchId, lessonId, annotationId, user);
  }
}
