import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { isStaffRole } from "../auth/staff";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CreateProjectReviewDto } from "./dto/project-review.dto";
import { ProjectReviewService } from "./project-review.service";

interface AuthedUser {
  userId: string;
  role: string;
}

const STAFF_ROLES = [UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR] as const;

@ApiTags("project-review")
@ApiBearerAuth()
@Controller("project-review")
export class ProjectReviewController {
  constructor(private readonly reviewService: ProjectReviewService) {}

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Get next submission awaiting review" })
  @Get("queue")
  getQueue(@CurrentUser() user: AuthedUser) {
    return this.reviewService.getReviewQueue(user.userId, user.role);
  }

  @Authenticated()
  @ApiOperation({ summary: "Get detailed submission view including check run and review" })
  @Get("submissions/:submissionId")
  getSubmission(
    @Param("submissionId") submissionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reviewService.getSubmissionDetail(
      submissionId,
      user.userId,
      isStaffRole(user.role),
    );
  }

  @Authenticated()
  @ApiOperation({ summary: "Get automated check run results for a submission" })
  @Get("submissions/:submissionId/checks")
  getChecks(
    @Param("submissionId") submissionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reviewService.getCheckRun(
      submissionId,
      user.userId,
      isStaffRole(user.role),
    );
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Get similarity flags for a submission (staff only)" })
  @Get("submissions/:submissionId/flags")
  getFlags(@Param("submissionId") submissionId: string) {
    return this.reviewService.getFlags(submissionId);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Submit a review decision for a milestone submission" })
  @Post("submissions/:submissionId/review")
  @HttpCode(201)
  createReview(
    @Param("submissionId") submissionId: string,
    @Body() dto: CreateProjectReviewDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reviewService.createReview(submissionId, dto, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Get the review for a submission" })
  @Get("submissions/:submissionId/review")
  getReview(
    @Param("submissionId") submissionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reviewService.getReview(
      submissionId,
      user.userId,
      isStaffRole(user.role),
    );
  }
}
