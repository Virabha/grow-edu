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
  ApiTags,
} from "@nestjs/swagger";
import { AssignmentsService } from "./assignments.service";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto";
import { FilterAssignmentsDto } from "./dto/filter-assignments.dto";
import { SubmitAssignmentDto } from "./dto/submit-assignment.dto";
import { GradeSubmissionDto } from "./dto/grade-submission.dto";
import { FilterSubmissionsDto } from "./dto/filter-submissions.dto";
import { PaginationDto } from "../common/dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Authenticated } from '../auth/decorators/authenticated.decorator';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("assignments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("assignments")
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @ApiOperation({ summary: "List assignments (instructor sees own; admin sees all)" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Get()
  async findAll(@Query() query: FilterAssignmentsDto, @CurrentUser() user: AuthedUser) {
    return this.assignmentsService.listAssignments(user.userId, user.role, query);
  }

  @ApiOperation({ summary: "Create an assignment" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Post()
  async create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: AuthedUser) {
    return this.assignmentsService.createAssignment(user.userId, user.role, dto);
  }

  @ApiOperation({ summary: "Get an assignment by id" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Get(":assignmentId")
  async findOne(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assignmentsService.getAssignment(assignmentId, user.userId, user.role);
  }

  @ApiOperation({ summary: "Update an assignment" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Patch(":assignmentId")
  async update(
    @Param("assignmentId") assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assignmentsService.updateAssignment(
      assignmentId,
      user.userId,
      user.role,
      dto,
    );
  }

  @ApiOperation({ summary: "Soft-delete an assignment" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Delete(":assignmentId")
  async remove(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assignmentsService.deleteAssignment(assignmentId, user.userId, user.role);
  }

  @ApiOperation({ summary: "List submissions for an assignment (staff)" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Get(":assignmentId/submissions")
  async listSubmissions(
    @Param("assignmentId") assignmentId: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assignmentsService.listAssignmentSubmissions(
      assignmentId,
      user.userId,
      user.role,
      query,
    );
  }

  @Authenticated()
  @ApiOperation({ summary: "Submit an assignment (enrolled learner)" })
  @Post(":assignmentId/submissions")
  async submit(
    @Param("assignmentId") assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assignmentsService.submitAssignment(assignmentId, user.userId, dto);
  }

  @ApiOperation({ summary: "Grade a submission (staff)" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Patch(":assignmentId/submissions/:submissionId/grade")
  async gradeByAssignment(
    @Param("submissionId") submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assignmentsService.gradeSubmission(
      submissionId,
      user.userId,
      user.role,
      dto,
    );
  }
}

@ApiTags("assignment-submissions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("assignment-submissions")
export class AssignmentSubmissionsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @ApiOperation({ summary: "List all submissions across assignments (staff)" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Get()
  async findAll(@Query() query: FilterSubmissionsDto, @CurrentUser() user: AuthedUser) {
    return this.assignmentsService.listAllSubmissions(user.userId, user.role, query);
  }

  @ApiOperation({ summary: "Grade a submission (staff)" })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Patch(":submissionId")
  async grade(
    @Param("submissionId") submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assignmentsService.gradeSubmission(
      submissionId,
      user.userId,
      user.role,
      dto,
    );
  }
}
