import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { LectureSummaryService } from "./lecture-summary.service";

interface AuthedUser {
  userId: string;
  organizationId?: string;
}

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai/lessons")
export class LectureSummaryController {
  constructor(private readonly summaries: LectureSummaryService) {}

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Submit a lesson for AI summarisation" })
  @Post(":lessonId/summarize")
  async summarize(
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.summaries.submitSummarize(
      lessonId,
      user.userId,
      user.organizationId ?? null,
    );
  }

  @Authenticated()
  @ApiOperation({ summary: "Get the AI-generated summary for a lesson" })
  @Get(":lessonId/summary")
  async getSummary(@Param("lessonId") lessonId: string) {
    const summary = await this.summaries.getForLesson(lessonId);
    if (!summary) {
      throw new NotFoundException("No summary found for this lesson");
    }
    return summary;
  }
}
