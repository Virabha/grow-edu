import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ModerationService } from './moderation.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('community')
@ApiBearerAuth()
@Controller('batches/:batchId/moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Report a post or group message' })
  @Post('reports')
  createReport(
    @Param('batchId') batchId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.moderation.createReport(batchId, dto, user);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'List content reports (staff only)' })
  @Get('reports')
  listReports(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.moderation.listReports(batchId, user);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'Resolve or dismiss a report (staff only)' })
  @Patch('reports/:reportId')
  resolveReport(
    @Param('batchId') batchId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.moderation.resolveReport(batchId, reportId, dto, user);
  }
}
