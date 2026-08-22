import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { CreateRecurrenceSeriesDto } from "../dto/create-recurrence-series.dto";
import { RescheduleSessionDto } from "../dto/reschedule-session.dto";
import { RecurrenceService } from "./recurrence.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class RecurrenceController {
  constructor(private readonly recurrence: RecurrenceService) {}

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Define a recurring session pattern" })
  @Post(":batchId/recurrence")
  create(
    @Param("batchId") batchId: string,
    @Body() dto: CreateRecurrenceSeriesDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.recurrence.create(batchId, dto, user.userId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "List recurrence series for a batch" })
  @Get(":batchId/recurrence")
  list(@Param("batchId") batchId: string) {
    return this.recurrence.list(batchId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete a recurrence series and its future sessions" })
  @Delete(":batchId/recurrence/:seriesId")
  deleteSeries(
    @Param("batchId") batchId: string,
    @Param("seriesId") seriesId: string,
  ) {
    return this.recurrence.deleteSeries(batchId, seriesId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Reschedule a single session — notifies every enrolled student" })
  @Post(":batchId/sessions/:sessionId/reschedule")
  reschedule(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: RescheduleSessionDto,
  ) {
    return this.recurrence.reschedule(batchId, sessionId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Cancel a session — notifies every enrolled student" })
  @Post(":batchId/sessions/:sessionId/cancel")
  cancel(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.recurrence.cancel(batchId, sessionId);
  }
}
