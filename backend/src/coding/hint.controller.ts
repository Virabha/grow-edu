import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { isStaffRole } from "../auth/staff";
import { AiHintService } from "./hint.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("coding")
@ApiBearerAuth()
@Controller("coding")
export class AiHintController {
  constructor(private readonly hints: AiHintService) {}

  @Authenticated()
  @ApiOperation({ summary: "Request the next graduated hint for a submission" })
  @Post("runs/:runId/hints")
  requestHint(
    @Param("runId") runId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.hints.requestHint(runId, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "List hints taken for a submission" })
  @Get("runs/:runId/hints")
  listHints(
    @Param("runId") runId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.hints.listHints(runId, user.userId, isStaffRole(user.role));
  }
}
