import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { AiProjectFeedbackService } from "./ai-feedback.service";

const STAFF_ROLES = [UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR] as const;

@ApiTags("project-review")
@ApiBearerAuth()
@Controller("project-review")
export class AiProjectFeedbackController {
  constructor(private readonly feedback: AiProjectFeedbackService) {}

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Get the AI feedback draft for a submission (reviewer only)" })
  @Get("submissions/:submissionId/ai-feedback")
  getDraft(@Param("submissionId") submissionId: string) {
    return this.feedback.getDraft(submissionId);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Discard the AI feedback draft for a submission" })
  @Delete("submissions/:submissionId/ai-feedback")
  @HttpCode(200)
  discardDraft(@Param("submissionId") submissionId: string) {
    return this.feedback.discardDraft(submissionId);
  }
}
