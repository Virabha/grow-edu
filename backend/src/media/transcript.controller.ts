import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BatchAccess } from '../batches/access/batch-access.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TranscriptService } from './transcript.service';
import { RequestTranscriptDto } from './dto/request-transcript.dto';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('transcripts')
@Controller('batches/:batchId/lessons/:lessonId/transcript')
export class TranscriptController {
  constructor(private readonly transcripts: TranscriptService) {}

  @ApiOperation({ summary: 'Request transcription for a lesson' })
  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  async request(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: RequestTranscriptDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.transcripts.request(lessonId, batchId, user, dto.language);
  }

  @ApiOperation({ summary: 'Retry a failed transcription' })
  @Post('retry')
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  async retry(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.transcripts.retry(lessonId, batchId, user);
  }

  @ApiOperation({ summary: 'Get transcript status and segments' })
  @Get()
  @BatchAccess('READ')
  async getTranscript(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.transcripts.getTranscript(lessonId, batchId, user);
  }

  @ApiOperation({ summary: 'Search within a lesson transcript' })
  @Get('search')
  @BatchAccess('READ')
  async search(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @Query('q') query: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.transcripts.search(lessonId, batchId, user, query ?? '');
  }
}
