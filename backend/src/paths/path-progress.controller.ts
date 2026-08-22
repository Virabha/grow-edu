import { Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { PathProgressService } from './path-progress.service';

type JwtUser = { userId: string; role: string };

@Controller('paths')
export class PathProgressController {
  constructor(private readonly progressService: PathProgressService) {}

  @Authenticated()
  @Get(':pathId/my-progress')
  myProgress(@Param('pathId') pathId: string, @CurrentUser() user: JwtUser) {
    return this.progressService.myProgress(pathId, user.userId);
  }

  @Authenticated()
  @Post(':pathId/stages/:stageId/complete')
  completeStage(
    @Param('pathId') pathId: string,
    @Param('stageId') stageId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.progressService.completeStage(pathId, stageId, user.userId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(':pathId/students')
  allStudentsProgress(@Param('pathId') pathId: string) {
    return this.progressService.allStudentsProgress(pathId);
  }
}
