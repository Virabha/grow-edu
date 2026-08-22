import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { ScheduleMockInterviewDto } from "./dto/schedule-mock-interview.dto";
import { SubmitScoreDto } from "./dto/submit-score.dto";
import { MockInterviewsService } from "./mock-interviews.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("mock-interviews")
@Controller("mock-interviews")
export class MockInterviewsController {
  constructor(private readonly mockInterviews: MockInterviewsService) {}

  @Roles("INSTRUCTOR", "PLATFORM_ADMIN")
  @Post()
  schedule(
    @Body() dto: ScheduleMockInterviewDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mockInterviews.schedule(dto, user.userId);
  }

  @Authenticated()
  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.mockInterviews.list(user.userId, user.role);
  }

  @Authenticated()
  @Get(":mockInterviewId")
  get(
    @Param("mockInterviewId") mockInterviewId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mockInterviews.get(mockInterviewId, user.userId, user.role);
  }

  @Roles("INSTRUCTOR", "PLATFORM_ADMIN")
  @Post(":mockInterviewId/complete")
  complete(
    @Param("mockInterviewId") mockInterviewId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mockInterviews.complete(mockInterviewId, user.userId);
  }

  @Roles("INSTRUCTOR", "PLATFORM_ADMIN")
  @Post(":mockInterviewId/scores")
  submitScore(
    @Param("mockInterviewId") mockInterviewId: string,
    @Body() dto: SubmitScoreDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mockInterviews.submitScore(mockInterviewId, dto, user.userId);
  }

  @Authenticated()
  @Get(":mockInterviewId/scores")
  getScores(
    @Param("mockInterviewId") mockInterviewId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mockInterviews.getScores(mockInterviewId, user.userId, user.role);
  }
}
