import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { ResultService } from "./result.service";
import { WeakTopicService } from "./weak-topic.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment")
@Authenticated()
export class ResultController {
  constructor(
    private readonly results: ResultService,
    private readonly weakTopics: WeakTopicService,
  ) {}

  @ApiOperation({ summary: "Get the result of a submitted attempt" })
  @Get("attempts/:attemptId/result")
  getResult(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.results.getResult(attemptId, user.userId);
  }

  @ApiOperation({
    summary: "Compare my attempt against the top scorer for this test",
  })
  @Get("attempts/:attemptId/topper-comparison")
  getTopperComparison(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.results.getTopperComparison(attemptId, user.userId);
  }

  @ApiOperation({ summary: "Get my weak-topic map" })
  @Get("my/weak-topics")
  getWeakTopics(@CurrentUser() user: AuthedUser) {
    return this.weakTopics.forUser(user.userId);
  }
}
