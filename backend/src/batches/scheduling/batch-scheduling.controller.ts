import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BatchManagerGuard } from "../access/batch-manager.guard";
import { RecordAttendanceDto } from "../dto/batch-attendance.dto";
import {
  CreateBatchSessionDto,
  UpdateBatchSessionDto,
} from "../dto/batch-session.dto";
import { BatchSchedulingService } from "./batch-scheduling.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class BatchSchedulingController {
  constructor(private readonly scheduling: BatchSchedulingService) {}

  @ApiOperation({ summary: "List sessions in a batch (enrolled or staff)" })
  @ApiQuery({ name: "type", enum: ["LIVE", "RECORDING"], required: false })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/sessions")
  list(
    @Param("batchId") batchId: string,
    @Query("type") type: "LIVE" | "RECORDING" | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.list(batchId, user, type);
  }

  @ApiOperation({ summary: "Get a session with a signed playback URL" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/sessions/:sessionId")
  get(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.getWithPlayback(batchId, sessionId, user);
  }

  @ApiOperation({ summary: "Schedule a live class or add a recording" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/sessions")
  create(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchSessionDto,
  ) {
    return this.scheduling.create(batchId, dto);
  }

  @ApiOperation({ summary: "Update a session (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/sessions/:sessionId")
  update(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: UpdateBatchSessionDto,
  ) {
    return this.scheduling.update(batchId, sessionId, dto);
  }

  @ApiOperation({ summary: "Delete a session (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/sessions/:sessionId")
  remove(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.scheduling.remove(batchId, sessionId);
  }

  @ApiOperation({ summary: "Record attendance for a live session (learner)" })
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/sessions/:sessionId/attendance")
  recordAttendance(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: RecordAttendanceDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.scheduling.recordAttendance(batchId, sessionId, user, dto);
  }

  @ApiOperation({ summary: "List attendance for a session (admin or teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Get(":batchId/sessions/:sessionId/attendance")
  listAttendance(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.scheduling.listAttendance(batchId, sessionId);
  }
}
