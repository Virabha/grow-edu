import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles, UserRole } from '../../auth/decorators/roles.decorator';
import { QuestionImportService } from './question-import.service';

interface AuthedUser {
  userId: string;
}

@ApiTags('assessment')
@ApiBearerAuth()
@Controller('assessment/imports')
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
export class QuestionImportController {
  constructor(private readonly service: QuestionImportService) {}

  @ApiOperation({ summary: 'Parse and preview a bulk question import' })
  @Post()
  preview(
    @Body('rows') rows: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const safeRows = Array.isArray(rows) ? rows : [];
    return this.service.preview(safeRows, user.userId);
  }

  @ApiOperation({ summary: 'Get the preview and status of an import' })
  @Get(':importId')
  get(@Param('importId') importId: string) {
    return this.service.getImport(importId);
  }

  @ApiOperation({ summary: 'Commit a clean import as a queued job' })
  @Post(':importId/commit')
  commit(@Param('importId') importId: string, @CurrentUser() user: AuthedUser) {
    return this.service.commit(importId, user.userId);
  }
}
