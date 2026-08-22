import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import {
  CreateMilestoneDto,
  CreateProjectDto,
  EnrolDto,
  SubmitMilestoneDto,
  UpdateMilestoneDto,
  UpdateProjectDto,
} from "./dto/project.dto";
import { ProjectsService } from "./projects.service";

interface AuthedUser {
  userId: string;
  role: string;
}

const STAFF_ROLES = [UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR] as const;

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Create a project brief" })
  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthedUser) {
    return this.projects.createProject(dto, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Get a project with its rubric and milestones" })
  @Get(":projectId")
  get(@Param("projectId") projectId: string) {
    return this.projects.getProject(projectId);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Update project metadata" })
  @Patch(":projectId")
  update(@Param("projectId") projectId: string, @Body() dto: UpdateProjectDto) {
    return this.projects.updateProject(projectId, dto);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Soft-delete a project" })
  @Delete(":projectId")
  @HttpCode(200)
  remove(@Param("projectId") projectId: string) {
    return this.projects.deleteProject(projectId);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Add a milestone to a project" })
  @Post(":projectId/milestones")
  addMilestone(
    @Param("projectId") projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projects.addMilestone(projectId, dto);
  }

  @Authenticated()
  @ApiOperation({ summary: "List milestones for a project" })
  @Get(":projectId/milestones")
  listMilestones(@Param("projectId") projectId: string) {
    return this.projects.getMilestones(projectId);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Update a milestone" })
  @Patch(":projectId/milestones/:milestoneId")
  updateMilestone(
    @Param("projectId") projectId: string,
    @Param("milestoneId") milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.projects.updateMilestone(projectId, milestoneId, dto);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Soft-delete a milestone" })
  @Delete(":projectId/milestones/:milestoneId")
  @HttpCode(200)
  deleteMilestone(
    @Param("projectId") projectId: string,
    @Param("milestoneId") milestoneId: string,
  ) {
    return this.projects.deleteMilestone(projectId, milestoneId);
  }

  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Enrol a student into a project" })
  @Post(":projectId/enrol")
  enrol(@Param("projectId") projectId: string, @Body() dto: EnrolDto) {
    return this.projects.enrolStudent(projectId, dto);
  }

  @Authenticated()
  @ApiOperation({ summary: "Get my milestone progress for a project" })
  @Get(":projectId/progress")
  myProgress(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.projects.getProgress(projectId, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Submit a milestone" })
  @Post(":projectId/milestones/:milestoneId/submit")
  submit(
    @Param("projectId") projectId: string,
    @Param("milestoneId") milestoneId: string,
    @Body() dto: SubmitMilestoneDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.projects.submit(projectId, milestoneId, user.userId, dto);
  }

  @Authenticated()
  @ApiOperation({ summary: "List submissions for a project" })
  @Get(":projectId/submissions")
  listSubmissions(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    const isStaff =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.role === UserRole.INSTRUCTOR;
    return this.projects.listSubmissions(projectId, user.userId, isStaff);
  }
}
