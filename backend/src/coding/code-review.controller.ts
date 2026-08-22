import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { isStaffRole } from "../auth/staff";
import { AiCodeReviewService } from "./code-review.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("coding")
@ApiBearerAuth()
@Controller("coding")
export class AiCodeReviewController {
  constructor(private readonly codeReview: AiCodeReviewService) {}

  @Authenticated()
  @ApiOperation({ summary: "Get the AI code review for a completed submission" })
  @Get("runs/:runId/ai-review")
  getReview(
    @Param("runId") runId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.codeReview.getReview(runId, user.userId, isStaffRole(user.role));
  }
}
