import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { EnrolUserDto } from './dto/enrol-user.dto';
import { PathEnrolmentService } from './path-enrolment.service';

type JwtUser = { userId: string; role: string };

@Controller('paths')
export class PathEnrolmentController {
  constructor(private readonly enrolmentService: PathEnrolmentService) {}

  @Authenticated()
  @Get('mine')
  myEnrolments(@CurrentUser() user: JwtUser) {
    return this.enrolmentService.myEnrolments(user.userId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(':pathId/enrolments')
  listEnrolled(@Param('pathId') pathId: string) {
    return this.enrolmentService.listEnrolled(pathId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(':pathId/enrolments')
  enrol(
    @Param('pathId') pathId: string,
    @Body() dto: EnrolUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.enrolmentService.enrol(pathId, dto, user.userId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(':pathId/enrolments/:userId')
  revoke(@Param('pathId') pathId: string, @Param('userId') userId: string) {
    return this.enrolmentService.revoke(pathId, userId);
  }
}
