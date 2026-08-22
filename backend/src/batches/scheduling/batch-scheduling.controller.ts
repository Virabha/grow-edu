import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { CorrectAttendanceDto, RecordAttendanceDto } from "../dto/batch-attendance.dto";
import { AttachRecordingDto } from "../dto/attach-recording.dto";
import {
  CreateBatchSessionDto,
  UpdateBatchSessionDto,
} from "../dto/batch-session.dto";
import { BatchSchedulingService } from "./batch-scheduling.service";
import { RecordingService } from "./recording.service";
import { TimetableService } from "./timetable.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class BatchSchedulingController {
  constructor(
    private readonly scheduling: BatchSchedulingService,
    private readonly timetableService: TimetableService,
    private readonly recordingService: RecordingService,
  ) {}

  @BatchAccess("READ")
  @ApiOperation({ summary: "What is on today and next for this batch" })
  @Get(":batchId/timetable")
  timetable(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.timetableService.forBatch(batchId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "List sessions in a batch (enrolled or staff)" })
  @ApiQuery({ name: "type", enum: ["LIVE", "RECORDING"], required: false })
  @Get(":batchId/sessions")
  list(
    @Param("batchId") batchId: string,
    @Query("type") type: "LIVE" | "RECORDING" | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.list(batchId, user, type);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Get a session with a signed playback URL" })
  @Get(":batchId/sessions/:sessionId")
  get(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.getWithPlayback(batchId, sessionId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Schedule a live class or add a recording" })
  @Post(":batchId/sessions")
  create(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchSessionDto,
  ) {
    return this.scheduling.create(batchId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Update a session (admin or batch teacher)" })
  @Patch(":batchId/sessions/:sessionId")
  update(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: UpdateBatchSessionDto,
  ) {
    return this.scheduling.update(batchId, sessionId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete a session (admin or batch teacher)" })
  @Delete(":batchId/sessions/:sessionId")
  remove(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.scheduling.remove(batchId, sessionId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Record attendance for a live session (learner)" })
  @Post(":batchId/sessions/:sessionId/attendance")
  recordAttendance(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: RecordAttendanceDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.recordAttendance(batchId, sessionId, user, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "List attendance for a session (admin or teacher)" })
  @Get(":batchId/sessions/:sessionId/attendance")
  listAttendance(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.scheduling.listAttendance(batchId, sessionId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Instructor corrects an attendance record" })
  @Patch(":batchId/sessions/:sessionId/attendance/:userId")
  correctAttendance(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Param("userId") targetUserId: string,
    @Body() dto: CorrectAttendanceDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.correctAttendance(
      batchId,
      sessionId,
      targetUserId,
      user.userId,
      dto,
    );
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Student views their own attendance across the batch" })
  @Get(":batchId/attendance/me")
  myAttendance(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.myAttendance(batchId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Attach a recording to a session (webhook or admin)" })
  @Post(":batchId/sessions/:sessionId/recording")
  attachRecording(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: AttachRecordingDto,
  ) {
    return this.recordingService.attachRecording(batchId, sessionId, dto);
  }
}
