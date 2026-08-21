import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { RejectSubmissionDto } from "../dto/reject-submission.dto";
import { ApprovalsService } from "./approvals.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("approvals")
@ApiBearerAuth()
@Controller()
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: "Everything waiting for approval, whatever batch it belongs to",
  })
  @Get("admin/approvals")
  queue() {
    return this.approvals.queue();
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Approve an item and publish it to students" })
  @Post("admin/approvals/lessons/:lessonId/approve")
  approve(
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.approvals.approve(lessonId, user);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Send an item back to its author with a comment" })
  @Post("admin/approvals/lessons/:lessonId/reject")
  reject(
    @Param("lessonId") lessonId: string,
    @Body() dto: RejectSubmissionDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.approvals.reject(lessonId, dto, user);
  }

  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: "Your own submissions and any comment left on them",
  })
  @Get("instructor/submissions")
  mine(@CurrentUser() user: AuthedUser) {
    return this.approvals.mine(user);
  }
}
