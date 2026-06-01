import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { CoursesService } from "./courses.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import {
  ApproveCourseDto,
  RejectCourseDto,
  RequestChangesDto,
} from "./dto/review-course.dto";
import { FilterCoursesDto } from "./dto/filter-courses.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { Public } from "../auth/decorators/public.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("courses")
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({ summary: "Get all courses" })
  @ApiResponse({ status: 200, description: "List of courses" })
  @Get()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  async findAll(
    @Query() query: FilterCoursesDto,
    @CurrentUser() user?: { userId: string; role: string }
  ) {
    const userRole = user?.role;

    // ONLY auto-populate instructorId for INSTRUCTOR role (not for PLATFORM_ADMIN)
    // This ensures instructors see their own courses, but admins see all courses
    if (
      user &&
      userRole === "INSTRUCTOR" &&
      !query.instructorId
    ) {
      query.instructorId = user.userId;
    }

    return this.coursesService.findAll(query, userRole);
  }

  // IMPORTANT: Specific routes MUST come before parameterized routes in NestJS
  @ApiOperation({ summary: "Get course by slug" })
  @ApiResponse({ status: 200, description: "Course details" })
  @ApiResponse({ status: 404, description: "Course not found" })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get("slug/:slug")
  async findBySlug(
    @Param("slug") slug: string,
    @CurrentUser() user?: { userId: string; role: string },
  ) {
    return this.coursesService.findOne(slug, user?.userId, user?.role);
  }
  
  @ApiOperation({ summary: "Get course by ID" })
  @ApiResponse({ status: 200, description: "Course details" })
  @ApiResponse({ status: 404, description: "Course not found" })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user?: { userId: string; role: string }
  ) {
    return this.coursesService.findOne(id, user?.userId, user?.role);
  }

  @ApiOperation({ summary: "Create a new course" })
  @ApiResponse({ status: 201, description: "Course created successfully" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @Post()
  async create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: { userId: string }
  ) {
    return this.coursesService.create(dto, user.userId);
  }

  @ApiOperation({ summary: "Update course" })
  @ApiResponse({ status: 200, description: "Course updated successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: { userId: string; role: string }
  ) {
    return this.coursesService.update(id, dto, user.userId, user.role);
  }

  @ApiOperation({ summary: "Delete course" })
  @ApiResponse({ status: 200, description: "Course deleted successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: { userId: string; role: string }
  ) {
    return this.coursesService.delete(id, user.userId, user.role);
  }

  @ApiOperation({ summary: "Submit course for review" })
  @ApiResponse({ status: 200, description: "Course submitted successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(":id/submit-review")
  async submitForReview(
    @Param("id") id: string,
    @CurrentUser() user: { userId: string; role: string }
  ) {
    return this.coursesService.submitForReview(id, user.userId, user.role);
  }

  @ApiOperation({ summary: "Approve course" })
  @ApiResponse({ status: 200, description: "Course approved successfully" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @Post(":id/approve")
  async approve(
    @Param("id") id: string,
    @Body() dto: ApproveCourseDto,
    @CurrentUser() user: { userId: string; role: string }
  ) {
    return this.coursesService.approve(
      id,
      user.userId,
      user.role,
      dto.notes,
      dto.publish
    );
  }

  @ApiOperation({ summary: "Request changes for course" })
  @ApiResponse({ status: 200, description: "Changes requested successfully" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @Post(":id/request-changes")
  async requestChanges(
    @Param("id") id: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() user: { userId: string; role: string }
  ) {
    return this.coursesService.requestChanges(
      id,
      user.userId,
      user.role,
      dto.notes
    );
  }

  @ApiOperation({ summary: "Reject course" })
  @ApiResponse({ status: 200, description: "Course rejected successfully" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @Post(":id/reject")
  async reject(
    @Param("id") id: string,
    @Body() dto: RejectCourseDto,
    @CurrentUser() user: { userId: string; role: string }
  ) {
    return this.coursesService.reject(id, user.userId, user.role, dto.reason);
  }

  @ApiOperation({ summary: "Unpublish course" })
  @ApiResponse({ status: 200, description: "Course unpublished successfully" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @Post(":id/unpublish")
  async unpublish(
    @Param("id") id: string,
    @CurrentUser() user: { userId: string; role: string }
  ) {
    return this.coursesService.unpublish(id, user.userId, user.role);
  }
}
