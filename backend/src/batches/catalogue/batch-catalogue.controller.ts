import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import {
  AssignInstructorDto,
  CreateLessonDto,
  ReorderLessonsDto,
  UpdateLessonDto,
} from "../dto/batch-content.dto";
import {
  CreateBatchSubjectDto,
  UpdateBatchSubjectDto,
} from "../dto/batch-subject.dto";
import { CreateBatchDto } from "../dto/create-batch.dto";
import { FilterBatchesDto } from "../dto/filter-batches.dto";
import { UpdateBatchDto } from "../dto/update-batch.dto";
import { BatchCatalogueService } from "./batch-catalogue.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@Controller("batches")
export class BatchCatalogueController {
  constructor(private readonly catalogue: BatchCatalogueService) {}

  @ApiOperation({ summary: "List batches (public filters to published)" })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  findAll(@Query() query: FilterBatchesDto, @CurrentUser() user?: AuthedUser) {
    return this.catalogue.findAll(query, user ?? {});
  }

  @ApiOperation({ summary: "Create a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post()
  create(@Body() dto: CreateBatchDto, @CurrentUser() user: AuthedUser) {
    return this.catalogue.create(dto, user.userId);
  }

  @ApiOperation({ summary: "Update a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch(":batchId")
  update(@Param("batchId") batchId: string, @Body() dto: UpdateBatchDto) {
    return this.catalogue.update(batchId, dto);
  }

  @ApiOperation({ summary: "Soft-delete a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId")
  remove(@Param("batchId") batchId: string) {
    return this.catalogue.remove(batchId);
  }

  @ApiOperation({ summary: "List the instructors assigned to a batch" })
  @Public()
  @Get(":batchId/instructors")
  listInstructors(@Param("batchId") batchId: string) {
    return this.catalogue.listInstructors(batchId);
  }

  @ApiOperation({ summary: "Assign an instructor to a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/instructors")
  assignInstructor(
    @Param("batchId") batchId: string,
    @Body() dto: AssignInstructorDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.catalogue.assignInstructor(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Unassign an instructor from a batch (admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId/instructors/:instructorId")
  removeInstructor(
    @Param("batchId") batchId: string,
    @Param("instructorId") instructorId: string,
  ) {
    return this.catalogue.removeInstructor(batchId, instructorId);
  }

  @ApiOperation({ summary: "List subjects in a batch" })
  @Public()
  @Get(":batchId/subjects")
  listSubjects(@Param("batchId") batchId: string) {
    return this.catalogue.listSubjects(batchId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Create a subject (admin or batch teacher)" })
  @ApiBearerAuth()
  @Post(":batchId/subjects")
  createSubject(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchSubjectDto,
  ) {
    return this.catalogue.createSubject(batchId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Update a subject (admin or batch teacher)" })
  @ApiBearerAuth()
  @Patch(":batchId/subjects/:subjectId")
  updateSubject(
    @Param("batchId") batchId: string,
    @Param("subjectId") subjectId: string,
    @Body() dto: UpdateBatchSubjectDto,
  ) {
    return this.catalogue.updateSubject(batchId, subjectId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete a subject (admin or batch teacher)" })
  @ApiBearerAuth()
  @Delete(":batchId/subjects/:subjectId")
  deleteSubject(
    @Param("batchId") batchId: string,
    @Param("subjectId") subjectId: string,
  ) {
    return this.catalogue.deleteSubject(batchId, subjectId);
  }

  @ApiOperation({ summary: "The batch syllabus, free-preview lessons only" })
  @Public()
  @Get(":batchId/curriculum")
  previewContent(@Param("batchId") batchId: string) {
    return this.catalogue.previewContent(batchId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Subjects with their lessons (enrolled or staff)" })
  @ApiBearerAuth()
  @Get(":batchId/content")
  listContent(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.catalogue.listContent(batchId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Add a lesson to a subject (admin or teacher)" })
  @ApiBearerAuth()
  @Post(":batchId/lessons")
  createLesson(
    @Param("batchId") batchId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.catalogue.createLesson(batchId, dto, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Publish a lesson to students (admin)" })
  @ApiBearerAuth()
  @Post(":batchId/lessons/:lessonId/approve")
  approveLesson(
    @Param("batchId") batchId: string,
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.catalogue.approveLesson(batchId, lessonId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Reorder lessons within a batch (admin or teacher)" })
  @ApiBearerAuth()
  @Put(":batchId/lessons/reorder")
  reorderLessons(
    @Param("batchId") batchId: string,
    @Body() dto: ReorderLessonsDto,
  ) {
    return this.catalogue.reorderLessons(batchId, dto);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Read one lesson (enrolled, staff, or free preview)" })
  @ApiBearerAuth()
  @Get(":batchId/lessons/:lessonId")
  getLesson(
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.catalogue.getLesson(lessonId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Update a lesson (admin or batch teacher)" })
  @ApiBearerAuth()
  @Patch(":batchId/lessons/:lessonId")
  updateLesson(
    @Param("batchId") batchId: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.catalogue.updateLesson(batchId, lessonId, dto, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete a lesson (admin or batch teacher)" })
  @ApiBearerAuth()
  @Delete(":batchId/lessons/:lessonId")
  deleteLesson(
    @Param("batchId") batchId: string,
    @Param("lessonId") lessonId: string,
  ) {
    return this.catalogue.deleteLesson(batchId, lessonId);
  }

  @ApiOperation({ summary: "Get a batch by id or slug" })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get(":idOrSlug")
  findOne(
    @Param("idOrSlug") idOrSlug: string,
    @CurrentUser() user?: AuthedUser,
  ) {
    return this.catalogue.findOne(idOrSlug, user ?? {});
  }
}
