import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InstructorService } from './instructor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FilterInstructorCoursesDto } from './dto/filter-instructor-courses.dto';

@ApiTags('instructor')
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN, UserRole.LEARNER)
@ApiBearerAuth()
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @ApiOperation({ summary: 'Get instructor dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  @Get('stats')
  async getDashboardStats(@CurrentUser() user: { userId: string }) {
    return this.instructorService.getDashboardStats(user.userId);
  }

  @ApiOperation({ summary: 'Get instructor courses with details' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @Get('courses')
  async getInstructorCourses(
    @CurrentUser() user: { userId: string },
    @Query() query: FilterInstructorCoursesDto,
  ) {
    return this.instructorService.getInstructorCourses(user.userId, query.page, query.limit);
  }
}
