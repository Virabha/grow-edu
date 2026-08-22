import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AttemptService } from "./attempt.service";
import { FocusDto, SaveAnswerDto } from "./dto/attempt.dto";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment")
@Authenticated()
export class AttemptController {
  constructor(private readonly attempts: AttemptService) {}

  @ApiOperation({ summary: "Start an attempt at a test" })
  @Post("tests/:testId/attempts")
  start(@Param("testId") testId: string, @CurrentUser() user: AuthedUser) {
    return this.attempts.start(testId, user.userId);
  }

  @ApiOperation({ summary: "Read my attempt" })
  @Get("attempts/:attemptId")
  get(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.attempts.get(attemptId, user.userId);
  }

  @ApiOperation({ summary: "Save or revise an answer" })
  @Patch("attempts/:attemptId/answers/:placementId")
  saveAnswer(
    @Param("attemptId") attemptId: string,
    @Param("placementId") placementId: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.attempts.saveAnswer(
      attemptId,
      placementId,
      dto.response,
      user.userId,
    );
  }

  @ApiOperation({ summary: "Move to a question, attributing time to it" })
  @Post("attempts/:attemptId/focus")
  focus(
    @Param("attemptId") attemptId: string,
    @Body() dto: FocusDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.attempts.focus(attemptId, dto.placementId, user.userId);
  }

  @ApiOperation({ summary: "Submit an attempt for scoring" })
  @Post("attempts/:attemptId/submit")
  submit(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.attempts.submit(attemptId, user.userId);
  }
}
