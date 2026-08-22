import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateBatchEnrollmentsDto } from "../dto/batch-enrollment.dto";
import { FilterBatchEnrollmentsDto } from "../dto/filter-batch-enrollments.dto";
import {
  RecordLessonProgressDto,
  RecordPositionsDto,
} from "../dto/lesson-progress.dto";
import { BatchEnrolmentService } from "./batch-enrolment.service";
import { ContinueLearningService } from "./continue-learning.service";
import { LessonProgressService } from "./lesson-progress.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class BatchEnrolmentController {
  constructor(
    private readonly enrolments: BatchEnrolmentService,
    private readonly lessonProgress: LessonProgressService,
    private readonly continueLearning: ContinueLearningService,
  ) {}

  @Authenticated()
  @ApiOperation({ summary: "Resume what I was doing, across every batch" })
  @Get("continue-learning")
  resumeLearning(@CurrentUser() user: AuthedUser) {
    return this.continueLearning.forViewer(user);
  }

  @Authenticated()
  @ApiOperation({ summary: "Everything I have access to" })
  @Get("mine")
  findMine(@CurrentUser() user: AuthedUser) {
    return this.enrolments.findMine(user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Start a batch checkout (creates pending payment)" })
  @Post(":batchId/checkout")
  startCheckout(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.enrolments.startCheckout(batchId, user.userId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "List enrolled students (admin or batch teacher)" })
  @Get(":batchId/enrollments")
  list(
    @Param("batchId") batchId: string,
    @Query() query: FilterBatchEnrollmentsDto,
  ) {
    return this.enrolments.list(batchId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
  }

  @ApiOperation({ summary: "Add students to a batch (admin)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/enrollments")
  add(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchEnrollmentsDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.enrolments.addMany(batchId, dto, user.userId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "My lesson progress in a batch" })
  @Get(":batchId/progress")
  progress(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.lessonProgress.listFor(batchId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Record progress through a lesson" })
  @Put(":batchId/lessons/:lessonId/progress")
  recordProgress(
    @Param("batchId") batchId: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: RecordLessonProgressDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.lessonProgress.record(batchId, lessonId, user, dto);
  }

  @BatchAccess("READ")
  @ApiOperation({
    summary: "Record a batch of playback positions from the client",
  })
  @Put(":batchId/positions")
  recordPositions(
    @Param("batchId") batchId: string,
    @Body() dto: RecordPositionsDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.lessonProgress.recordPositions(batchId, user, dto);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Where to resume a lesson" })
  @Get(":batchId/lessons/:lessonId/position")
  position(
    @Param("batchId") batchId: string,
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.lessonProgress.positionFor(batchId, lessonId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Re-evaluate whether a lesson is complete" })
  @Post(":batchId/lessons/:lessonId/progress/reconcile")
  reconcileProgress(
    @Param("batchId") batchId: string,
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.lessonProgress.reconcile(batchId, lessonId, user);
  }

  @ApiOperation({ summary: "Revoke a student's batch access (admin)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId/enrollments/:userId")
  revoke(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
  ) {
    return this.enrolments.revoke(batchId, userId);
  }
}
