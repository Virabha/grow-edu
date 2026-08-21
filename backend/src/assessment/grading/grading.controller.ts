import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AttachFeedbackDto, GradeAnswerDto } from "./dto/grading.dto";
import { GradingService } from "./grading.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
@Controller("assessment/grading")
export class GradingController {
  constructor(private readonly grading: GradingService) {}

  @ApiOperation({ summary: "Get the next ungraded item in the queue" })
  @Get("queue")
  queue(@CurrentUser() user: AuthedUser) {
    return this.grading.getQueue(user.userId);
  }

  @ApiOperation({ summary: "Get an answer for grading with rubric and images" })
  @Get("answers/:answerId")
  getAnswer(
    @Param("answerId") answerId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.grading.getAnswerForGrading(answerId, user.userId);
  }

  @ApiOperation({ summary: "Grade an answer" })
  @Post("answers/:answerId/grade")
  grade(
    @Param("answerId") answerId: string,
    @Body() dto: GradeAnswerDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.grading.gradeAnswer(answerId, dto, user.userId);
  }

  @ApiOperation({ summary: "Attach media feedback to a graded answer" })
  @Post("answers/:answerId/feedback")
  attachFeedback(
    @Param("answerId") answerId: string,
    @Body() dto: AttachFeedbackDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.grading.attachFeedback(answerId, dto, user.userId);
  }
}

@ApiTags("assessment")
@ApiBearerAuth()
@Authenticated()
@Controller("assessment/grading")
export class FeedbackRetrievalController {
  constructor(private readonly grading: GradingService) {}

  @ApiOperation({ summary: "Retrieve feedback media for an answer" })
  @Get("answers/:answerId/feedback")
  getFeedback(
    @Param("answerId") answerId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.grading.getFeedback(answerId, user.userId, user.role);
  }
}
