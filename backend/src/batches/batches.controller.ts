import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { CertificateService } from "./certificate.service";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { BatchesService } from "./batches.service";
import { CreateBatchDto } from "./dto/create-batch.dto";
import { UpdateBatchDto } from "./dto/update-batch.dto";
import { FilterBatchesDto } from "./dto/filter-batches.dto";
import {
  CreateBatchSubjectDto,
  UpdateBatchSubjectDto,
} from "./dto/batch-subject.dto";
import {
  CreateBatchSessionDto,
  UpdateBatchSessionDto,
} from "./dto/batch-session.dto";
import { CreateBatchEnrollmentsDto } from "./dto/batch-enrollment.dto";
import {
  CreateBatchAnnouncementDto,
  UpdateBatchAnnouncementDto,
} from "./dto/batch-announcement.dto";
import {
  CreateBatchResourceDto,
  UpdateBatchResourceDto,
} from "./dto/batch-resource.dto";
import {
  CreateBatchDoubtDto,
  UpdateBatchDoubtDto,
  CreateDoubtReplyDto,
} from "./dto/batch-doubt.dto";
import { RecordAttendanceDto } from "./dto/batch-attendance.dto";
import {
  CreateBatchQuizDto,
  UpdateBatchQuizDto,
  CreateQuizQuestionDto,
  UpdateQuizQuestionDto,
  SubmitQuizAnswerDto,
} from "./dto/batch-quiz.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BatchManagerGuard } from "./guards/batch-manager.guard";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@Controller('batches')
export class BatchesController {
  constructor(
    private readonly batchesService: BatchesService,
    private readonly certificateService: CertificateService
  ) {}

  // ─── Batch CRUD ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List batches (public filters to published)" })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Query() query: FilterBatchesDto,
    @CurrentUser() user?: AuthedUser
  ) {
    if (user?.role === "INSTRUCTOR") {
      return this.batchesService.findAll(query, user.role, {
        teacherId: user.userId,
      });
    }
    return this.batchesService.findAll(query, user?.role);
  }

  @ApiOperation({ summary: "Get current user's enrolled batches" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("mine")
  async findMine(@CurrentUser() user: AuthedUser) {
    return this.batchesService.findMine(user.userId);
  }

  @ApiOperation({ summary: "Unified dashboard for the current user" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("dashboard")
  async dashboard(@CurrentUser() user: AuthedUser) {
    return this.batchesService.myDashboard(user.userId);
  }

  @ApiOperation({ summary: "Start a batch checkout (creates pending payment)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/checkout")
  async startCheckout(
    @Param("batchId") batchId: string,
    @Body() body: { couponCode?: string } | undefined,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.startBatchCheckout(batchId, user.userId, {
      couponCode: body?.couponCode,
    });
  }

  @ApiOperation({ summary: "Batch analytics (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Get(":batchId/analytics")
  async analytics(@Param("batchId") batchId: string) {
    return this.batchesService.analytics(batchId);
  }

  @ApiOperation({ summary: "My progress in a batch (learner)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/my-progress")
  async myProgress(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.myProgress(batchId, user.userId);
  }

  @ApiOperation({ summary: "Get a batch by id or slug" })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get(":idOrSlug")
  async findOne(
    @Param("idOrSlug") idOrSlug: string,
    @CurrentUser() user?: AuthedUser
  ) {
    return this.batchesService.findOne(idOrSlug, user?.userId, user?.role);
  }

  @ApiOperation({ summary: "Create a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post()
  async create(@Body() dto: CreateBatchDto, @CurrentUser() user: AuthedUser) {
    return this.batchesService.create(dto, user.userId);
  }

  @ApiOperation({ summary: "Update a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch(":batchId")
  async update(@Param("batchId") batchId: string, @Body() dto: UpdateBatchDto) {
    return this.batchesService.update(batchId, dto);
  }

  @ApiOperation({ summary: "Soft-delete a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId")
  async remove(@Param("batchId") batchId: string) {
    return this.batchesService.remove(batchId);
  }

  // ─── Subjects ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List subjects in a batch" })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get(":batchId/subjects")
  async listSubjects(@Param("batchId") batchId: string) {
    return this.batchesService.listSubjects(batchId);
  }

  @ApiOperation({ summary: "Create a subject (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/subjects")
  async createSubject(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchSubjectDto
  ) {
    return this.batchesService.createSubject(batchId, dto);
  }

  @ApiOperation({ summary: "Update a subject (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/subjects/:subjectId")
  async updateSubject(
    @Param("batchId") batchId: string,
    @Param("subjectId") subjectId: string,
    @Body() dto: UpdateBatchSubjectDto
  ) {
    return this.batchesService.updateSubject(batchId, subjectId, dto);
  }

  @ApiOperation({ summary: "Delete a subject (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/subjects/:subjectId")
  async deleteSubject(
    @Param("batchId") batchId: string,
    @Param("subjectId") subjectId: string
  ) {
    return this.batchesService.deleteSubject(batchId, subjectId);
  }

  // ─── Sessions ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List sessions in a batch (enrolled or admin)" })
  @ApiQuery({ name: "type", enum: ["LIVE", "RECORDING"], required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/sessions")
  async listSessions(
    @Param("batchId") batchId: string,
    @Query("type") type: "LIVE" | "RECORDING" | undefined,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.listSessions(batchId, {
      userId: user.userId,
      userRole: user.role,
      type,
    });
  }

  @ApiOperation({ summary: "Get session with signed playback URL" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/sessions/:sessionId")
  async getSession(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.getSessionWithPlayback(
      batchId,
      sessionId,
      user.userId,
      user.role
    );
  }

  @ApiOperation({
    summary: "Schedule a live session or add a recording (admin or teacher)",
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/sessions")
  async createSession(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchSessionDto
  ) {
    return this.batchesService.createSession(batchId, dto);
  }

  @ApiOperation({ summary: "Update a session (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/sessions/:sessionId")
  async updateSession(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: UpdateBatchSessionDto
  ) {
    return this.batchesService.updateSession(batchId, sessionId, dto);
  }

  @ApiOperation({ summary: "Delete a session (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/sessions/:sessionId")
  async deleteSession(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string
  ) {
    return this.batchesService.deleteSession(batchId, sessionId);
  }

  // ─── Enrollments ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List enrolled students in a batch (admin or teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Get(":batchId/enrollments")
  async listEnrollments(
    @Param("batchId") batchId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string
  ) {
    return this.batchesService.listEnrollments(batchId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @ApiOperation({ summary: "Add students to a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/enrollments")
  async addEnrollments(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchEnrollmentsDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.addEnrollments(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Revoke a student's batch access (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId/enrollments/:userId")
  async removeEnrollment(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string
  ) {
    return this.batchesService.removeEnrollment(batchId, userId);
  }

  // ─── Announcements ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List batch announcements (enrolled or admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/announcements")
  async listAnnouncements(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.listAnnouncements(batchId, {
      userId: user.userId,
      userRole: user.role,
    });
  }

  @ApiOperation({ summary: "Post a batch announcement (admin or teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/announcements")
  async createAnnouncement(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchAnnouncementDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.createAnnouncement(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Update an announcement (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/announcements/:announcementId")
  async updateAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string,
    @Body() dto: UpdateBatchAnnouncementDto
  ) {
    return this.batchesService.updateAnnouncement(batchId, announcementId, dto);
  }

  @ApiOperation({ summary: "Delete an announcement (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/announcements/:announcementId")
  async deleteAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string
  ) {
    return this.batchesService.deleteAnnouncement(batchId, announcementId);
  }

  // ─── Resources (DPP / Notes / Reference) ────────────────────────────────────

  @ApiOperation({ summary: "List PDF resources (enrolled or admin)" })
  @ApiQuery({ name: "type", enum: ["DPP", "NOTES", "REFERENCE"], required: false })
  @ApiQuery({ name: "subjectId", required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/resources")
  async listResources(
    @Param("batchId") batchId: string,
    @Query("type") type: "DPP" | "NOTES" | "REFERENCE" | undefined,
    @Query("subjectId") subjectId: string | undefined,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.listResources(batchId, {
      userId: user.userId,
      userRole: user.role,
      type,
      subjectId,
    });
  }

  @ApiOperation({ summary: "Upload a PDF resource (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/resources")
  async createResource(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchResourceDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.createResource(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Update a resource (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/resources/:resourceId")
  async updateResource(
    @Param("batchId") batchId: string,
    @Param("resourceId") resourceId: string,
    @Body() dto: UpdateBatchResourceDto
  ) {
    return this.batchesService.updateResource(batchId, resourceId, dto);
  }

  @ApiOperation({ summary: "Delete a resource (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/resources/:resourceId")
  async deleteResource(
    @Param("batchId") batchId: string,
    @Param("resourceId") resourceId: string
  ) {
    return this.batchesService.deleteResource(batchId, resourceId);
  }

  // ─── Doubts ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List doubts in a batch" })
  @ApiQuery({ name: "mine", required: false, type: Boolean })
  @ApiQuery({ name: "status", required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/doubts")
  async listDoubts(
    @Param("batchId") batchId: string,
    @Query("mine") mine: string | undefined,
    @Query("status") status: string | undefined,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.listDoubts(batchId, {
      userId: user.userId,
      userRole: user.role,
      mine: mine === "true",
      status,
    });
  }

  @ApiOperation({ summary: "Get a doubt with replies" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/doubts/:doubtId")
  async getDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.getDoubt(batchId, doubtId, user.userId, user.role);
  }

  @ApiOperation({ summary: "Post a doubt" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/doubts")
  async createDoubt(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchDoubtDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.createDoubt(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Update a doubt (author or admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(":batchId/doubts/:doubtId")
  async updateDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: UpdateBatchDoubtDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.updateDoubt(
      batchId,
      doubtId,
      dto,
      user.userId,
      user.role
    );
  }

  @ApiOperation({ summary: "Delete a doubt (author or admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(":batchId/doubts/:doubtId")
  async deleteDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.deleteDoubt(batchId, doubtId, user.userId, user.role);
  }

  @ApiOperation({ summary: "Reply to a doubt" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/doubts/:doubtId/replies")
  async createDoubtReply(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: CreateDoubtReplyDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.addDoubtReply(
      batchId,
      doubtId,
      dto,
      user.userId,
      user.role
    );
  }

  @ApiOperation({ summary: "Delete a doubt reply" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(":batchId/doubts/:doubtId/replies/:replyId")
  async deleteDoubtReply(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Param("replyId") replyId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.deleteDoubtReply(
      batchId,
      doubtId,
      replyId,
      user.userId,
      user.role
    );
  }

  // ─── Attendance ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Record attendance for a live session (learner)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/sessions/:sessionId/attendance")
  async recordAttendance(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: RecordAttendanceDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.recordAttendance(batchId, sessionId, user.userId, dto);
  }

  @ApiOperation({ summary: "List attendance for a session (admin or teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Get(":batchId/sessions/:sessionId/attendance")
  async listAttendance(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string
  ) {
    return this.batchesService.listAttendance(batchId, sessionId);
  }

  // ─── Quizzes ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List quizzes in a batch" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes")
  async listQuizzes(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.listQuizzes(batchId, {
      userId: user.userId,
      userRole: user.role,
    });
  }

  @ApiOperation({ summary: "Get a quiz with questions" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId")
  async getQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.getQuiz(batchId, quizId, {
      userId: user.userId,
      userRole: user.role,
    });
  }

  @ApiOperation({ summary: "Create a quiz (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/quizzes")
  async createQuiz(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchQuizDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.createQuiz(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Update a quiz (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/quizzes/:quizId")
  async updateQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Body() dto: UpdateBatchQuizDto
  ) {
    return this.batchesService.updateQuiz(batchId, quizId, dto);
  }

  @ApiOperation({ summary: "Delete a quiz (admin or batch teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/quizzes/:quizId")
  async deleteQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string
  ) {
    return this.batchesService.deleteQuiz(batchId, quizId);
  }

  // Quiz questions
  @ApiOperation({ summary: "Add a question to a quiz (admin or teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/quizzes/:quizId/questions")
  async createQuizQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Body() dto: CreateQuizQuestionDto
  ) {
    return this.batchesService.createQuizQuestion(batchId, quizId, dto);
  }

  @ApiOperation({ summary: "Update a quiz question (admin or teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/quizzes/:quizId/questions/:questionId")
  async updateQuizQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuizQuestionDto
  ) {
    return this.batchesService.updateQuizQuestion(batchId, quizId, questionId, dto);
  }

  @ApiOperation({ summary: "Delete a quiz question (admin or teacher)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/quizzes/:quizId/questions/:questionId")
  async deleteQuizQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string
  ) {
    return this.batchesService.deleteQuizQuestion(batchId, quizId, questionId);
  }

  // Quiz attempts
  @ApiOperation({ summary: "Start a quiz attempt (learner)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/quizzes/:quizId/attempts")
  async startQuizAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.startQuizAttempt(batchId, quizId, user.userId);
  }

  @ApiOperation({ summary: "Submit a quiz attempt (learner)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/quizzes/:quizId/attempts/:attemptId/submit")
  async submitQuizAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitQuizAnswerDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.submitQuizAttempt(
      batchId,
      quizId,
      attemptId,
      dto,
      user.userId
    );
  }

  @ApiOperation({ summary: "Get one of my attempts" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId/attempts/:attemptId")
  async getAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.getAttempt(
      batchId,
      quizId,
      attemptId,
      user.userId,
      user.role
    );
  }

  @ApiOperation({ summary: "List my attempts for a quiz" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId/attempts")
  async listMyAttempts(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.listMyAttempts(batchId, quizId, user.userId);
  }

  @ApiOperation({ summary: "Quiz leaderboard" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId/leaderboard")
  async quizLeaderboard(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string
  ) {
    return this.batchesService.quizLeaderboard(batchId, quizId);
  }

  // ─── Certificates ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Issue a certificate to a student (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/certificates/:userId")
  async issueCertificate(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @Body() body: { requireCompletion?: boolean }
  ) {
    return this.certificateService.issue(batchId, userId, {
      requireCompletion: body?.requireCompletion ?? false,
    });
  }

  @ApiOperation({ summary: "Revoke a certificate (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId/certificates/:userId")
  async revokeCertificate(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string
  ) {
    return this.certificateService.revoke(batchId, userId);
  }

  @ApiOperation({ summary: "List certificates in a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(":batchId/certificates")
  async listBatchCertificates(@Param("batchId") batchId: string) {
    return this.certificateService.listForBatch(batchId);
  }

  @ApiOperation({ summary: "Get my certificate metadata for a batch" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/my-certificate")
  async myCertificate(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser
  ) {
    const cert = await this.certificateService.getForUser(batchId, user.userId);
    return { certificate: cert };
  }

  @ApiOperation({ summary: "Download my certificate as PDF" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/my-certificate/download")
  @Header("Content-Type", "application/pdf")
  async downloadMyCertificate(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
    @Res() res: Response
  ) {
    const pdf = await this.certificateService.renderPdf(batchId, user.userId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${batchId}.pdf"`
    );
    res.send(pdf);
  }

  @ApiOperation({ summary: "Download a student's certificate (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(":batchId/certificates/:userId/download")
  @Header("Content-Type", "application/pdf")
  async downloadCertificate(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @Res() res: Response
  ) {
    const pdf = await this.certificateService.renderPdf(batchId, userId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${batchId}-${userId}.pdf"`
    );
    res.send(pdf);
  }
}
