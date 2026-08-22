import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AssignMentorDto } from "./dto/assign-mentor.dto";
import { CreateMentorSessionDto } from "./dto/create-mentor-session.dto";
import { WriteFeedbackDto } from "./dto/write-feedback.dto";
import { MentorshipService } from "./mentorship.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("mentorship")
@Controller("mentorship")
export class MentorshipController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Roles("PLATFORM_ADMIN")
  @Post("assignments")
  assign(@Body() dto: AssignMentorDto, @CurrentUser() user: AuthedUser) {
    return this.mentorship.assign(dto, user.userId);
  }

  @Authenticated()
  @Get("assignments")
  listAssignments(
    @CurrentUser() user: AuthedUser,
    @Query("mentorId") mentorId?: string,
    @Query("studentId") studentId?: string,
  ) {
    return this.mentorship.listAssignments(user.userId, user.role, {
      mentorId,
      studentId,
    });
  }

  @Roles("PLATFORM_ADMIN")
  @Delete("assignments/:assignmentId")
  revoke(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mentorship.revoke(assignmentId, user.userId);
  }

  @Roles("PLATFORM_ADMIN")
  @Get("engagement")
  engagement() {
    return this.mentorship.engagement();
  }

  @Roles("INSTRUCTOR", "PLATFORM_ADMIN")
  @Post("sessions")
  createSession(
    @Body() dto: CreateMentorSessionDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mentorship.createSession(dto, user.userId);
  }

  @Authenticated()
  @Get("sessions")
  listSessions(@CurrentUser() user: AuthedUser) {
    return this.mentorship.listSessions(user.userId, user.role);
  }

  @Roles("INSTRUCTOR", "PLATFORM_ADMIN")
  @Put("sessions/:sessionId/feedback")
  writeFeedback(
    @Param("sessionId") sessionId: string,
    @Body() dto: WriteFeedbackDto,
    @CurrentUser() user: AuthedUser,
    @Query("studentId") studentId: string,
  ) {
    return this.mentorship.writeFeedback(sessionId, user.userId, studentId, dto);
  }

  @Roles("INSTRUCTOR", "PLATFORM_ADMIN")
  @Get("sessions/:sessionId/feedback")
  getFeedback(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.mentorship.getFeedback(sessionId, user.userId, user.role);
  }
}
