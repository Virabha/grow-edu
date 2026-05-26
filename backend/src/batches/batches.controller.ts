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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@Controller("batches")
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

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
    return this.batchesService.findAll(query, user?.role);
  }

  @ApiOperation({ summary: "Get current user's enrolled batches" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("mine")
  async findMine(@CurrentUser() user: AuthedUser) {
    return this.batchesService.findMine(user.userId);
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

  @ApiOperation({ summary: "Create a subject (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/subjects")
  async createSubject(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchSubjectDto
  ) {
    return this.batchesService.createSubject(batchId, dto);
  }

  @ApiOperation({ summary: "Update a subject (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch(":batchId/subjects/:subjectId")
  async updateSubject(
    @Param("batchId") batchId: string,
    @Param("subjectId") subjectId: string,
    @Body() dto: UpdateBatchSubjectDto
  ) {
    return this.batchesService.updateSubject(batchId, subjectId, dto);
  }

  @ApiOperation({ summary: "Delete a subject (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
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

  @ApiOperation({ summary: "Schedule a live session or add a recording (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/sessions")
  async createSession(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchSessionDto
  ) {
    return this.batchesService.createSession(batchId, dto);
  }

  @ApiOperation({ summary: "Update a session (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch(":batchId/sessions/:sessionId")
  async updateSession(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: UpdateBatchSessionDto
  ) {
    return this.batchesService.updateSession(batchId, sessionId, dto);
  }

  @ApiOperation({ summary: "Delete a session (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId/sessions/:sessionId")
  async deleteSession(
    @Param("batchId") batchId: string,
    @Param("sessionId") sessionId: string
  ) {
    return this.batchesService.deleteSession(batchId, sessionId);
  }

  // ─── Enrollments ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List enrolled students in a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
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

  @ApiOperation({ summary: "Post a batch announcement (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/announcements")
  async createAnnouncement(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchAnnouncementDto,
    @CurrentUser() user: AuthedUser
  ) {
    return this.batchesService.createAnnouncement(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Update an announcement (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch(":batchId/announcements/:announcementId")
  async updateAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string,
    @Body() dto: UpdateBatchAnnouncementDto
  ) {
    return this.batchesService.updateAnnouncement(batchId, announcementId, dto);
  }

  @ApiOperation({ summary: "Delete an announcement (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId/announcements/:announcementId")
  async deleteAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string
  ) {
    return this.batchesService.deleteAnnouncement(batchId, announcementId);
  }
}
