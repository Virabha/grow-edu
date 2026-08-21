import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { RejectSubmissionDto } from "../dto/reject-submission.dto";
import {
  SchedulePublicationDto,
  SetUnlockRuleDto,
} from "../dto/unlock-rule.dto";
import { BatchAccess } from "../access/batch-access.decorator";
import { ApprovalsService } from "./approvals.service";
import { PublicationService } from "./publication.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("approvals")
@ApiBearerAuth()
@Controller()
export class ApprovalsController {
  constructor(
    private readonly approvals: ApprovalsService,
    private readonly publication: PublicationService,
  ) {}

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

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: "Approve an item now but publish it at a chosen time",
  })
  @Post("admin/approvals/lessons/:lessonId/schedule")
  schedule(
    @Param("lessonId") lessonId: string,
    @Body() dto: SchedulePublicationDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.publication.schedule(lessonId, dto, user);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Call off a publication that has not fired yet" })
  @Delete("admin/approvals/lessons/:lessonId/schedule")
  cancelSchedule(
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.publication.cancelSchedule(lessonId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({
    summary: "Set when a lesson unlocks: a fixed date or days after enrolment",
  })
  @Put("batches/:batchId/lessons/:lessonId/unlock-rule")
  setUnlockRule(
    @Param("batchId") batchId: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: SetUnlockRuleDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.publication.setUnlockRule(batchId, lessonId, dto, user);
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
