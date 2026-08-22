import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParentViewService } from './parent-view.service';

interface AuthedUser {
  userId: string;
}

@ApiTags('parents')
@ApiBearerAuth()
@Controller('parents/students')
export class ParentViewController {
  constructor(private readonly service: ParentViewService) {}

  @Authenticated()
  @ApiOperation({ summary: "View a linked student's progress in a batch" })
  @Get(':studentId/batches/:batchId/progress')
  progress(
    @Param('studentId') studentId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.service.progress(user.userId, studentId, batchId);
  }

  @Authenticated()
  @ApiOperation({ summary: "View a linked student's attendance in a batch" })
  @Get(':studentId/batches/:batchId/attendance')
  attendance(
    @Param('studentId') studentId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.service.attendance(user.userId, studentId, batchId);
  }

  @Authenticated()
  @ApiOperation({ summary: "View a linked student's assessment result" })
  @Get(':studentId/attempts/:attemptId/result')
  result(
    @Param('studentId') studentId: string,
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.service.result(user.userId, studentId, attemptId);
  }
}
