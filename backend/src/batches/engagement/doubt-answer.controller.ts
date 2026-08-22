import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { DoubtAnswerService } from "./doubt-answer.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("doubts")
@ApiBearerAuth()
@Controller("batches")
export class DoubtAnswerController {
  constructor(private readonly answers: DoubtAnswerService) {}

  @BatchAccess("READ")
  @ApiOperation({ summary: "Student marks automated answer unhelpful and escalates to a human" })
  @Post(":batchId/doubts/:doubtId/escalate")
  escalate(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.answers.escalate(batchId, doubtId, user.userId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Instructor reads the AI-generated draft reply (never visible to student)" })
  @Get(":batchId/doubts/:doubtId/draft")
  getDraft(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.answers.getDraft(batchId, doubtId, user.userId, user.role);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Instructor commits the draft as their own reply" })
  @Post(":batchId/doubts/:doubtId/draft/commit")
  commitDraft(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.answers.commitDraft(batchId, doubtId, user.userId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Instructor discards the draft and will write their own reply" })
  @Delete(":batchId/doubts/:doubtId/draft")
  discardDraft(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
  ) {
    return this.answers.discardDraft(batchId, doubtId);
  }
}

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiDoubtReportController {
  constructor(private readonly answers: DoubtAnswerService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: "Answers students marked unhelpful, grouped by batch and subject — the primary AI quality signal",
  })
  @Get("doubts/unhelpful")
  unhelpful() {
    return this.answers.unhelpfulReport();
  }
}
