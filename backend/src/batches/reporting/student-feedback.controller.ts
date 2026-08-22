import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { WriteFeedbackDto } from "../dto/write-feedback.dto";
import { StudentFeedbackService } from "./student-feedback.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("feedback")
@ApiBearerAuth()
@Controller()
export class StudentFeedbackController {
  constructor(private readonly feedback: StudentFeedbackService) {}

  @BatchAccess("MANAGE")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: "Leave written feedback on a student" })
  @Post("batches/:batchId/students/:userId/feedback")
  write(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @Body() dto: WriteFeedbackDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feedback.write(batchId, userId, dto, user);
  }

  @BatchAccess("READ")
  @ApiOperation({
    summary: "Feedback on one student, readable by them and by batch staff",
  })
  @Get("batches/:batchId/students/:userId/feedback")
  forStudent(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feedback.forStudent(batchId, userId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Withdraw a piece of feedback" })
  @Delete("batches/:batchId/feedback/:feedbackId")
  remove(
    @Param("batchId") batchId: string,
    @Param("feedbackId") feedbackId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feedback.remove(batchId, feedbackId, user);
  }

  @Authenticated()
  @ApiOperation({ summary: "All the feedback left for you, across batches" })
  @Get("me/feedback")
  mine(@CurrentUser() user: AuthedUser) {
    return this.feedback.mine(user);
  }
}
