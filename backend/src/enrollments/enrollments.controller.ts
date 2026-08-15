import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
import { FilterEnrollmentsDto } from './dto/filter-enrollments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @ApiOperation({ summary: 'Get all enrollments' })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  @Get()
  async findAll(
    @Query() query: FilterEnrollmentsDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    // Non-admins can only see their own enrollments
    const userId =
      user.role !== 'PLATFORM_ADMIN' && user.role !== 'CORPORATE_ADMIN'
        ? user.userId
        : query.userId;

    return this.enrollmentsService.findAll({
      userId,
      courseId: query.courseId,
      companyId: query.companyId,
      status: query.status,
      source: query.source,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @ApiOperation({ summary: 'Check if user is enrolled in a course or has section access' })
  @ApiResponse({ status: 200, description: 'Enrollment/access status' })
  @Get('check-access/:courseId')
  async checkAccess(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    const enrollments = await this.enrollmentsService.findAll({
      userId: user.userId,
      courseId,
      limit: 1,
    });
    
    const enrollment = enrollments.data[0];
    
    return {
      isEnrolled: enrollments.data.length > 0,
      enrollmentId: enrollment?.enrollmentId,
      accessType: enrollment?.accessType || null, // 'FULL' or 'SECTION'
      accessedSections: enrollment?.accessedSections || null, // Array of sections if partial access
    };
  }

  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({ status: 200, description: 'Enrollment details' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @Get(':enrollmentId')
  async findOne(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.enrollmentsService.findOne(enrollmentId, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Create a new enrollment' })
  @ApiResponse({ status: 201, description: 'Enrollment created successfully' })
  @ApiResponse({ status: 409, description: 'User already enrolled' })
  @Post()
  async create(
    @Body() dto: CreateEnrollmentDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.enrollmentsService.create(dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Manually enrol a learner in a course (admin only)' })
  @ApiResponse({ status: 201, description: 'Learner enrolled' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post('manual')
  async manualEnrol(
    @Body() dto: { userId: string; courseId: string },
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.enrollmentsService.manualCreate(dto.userId, dto.courseId, user.userId);
  }

  @ApiOperation({ summary: 'Bulk create enrollments' })
  @ApiResponse({ status: 201, description: 'Bulk enrollment completed' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.CORPORATE_ADMIN, UserRole.PLATFORM_ADMIN)
  @Post('bulk')
  async bulkCreate(
    @Body() dto: BulkEnrollmentDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    // The company is resolved from the caller's own record inside the service.
    // It cannot be read from the JWT — that payload carries only userId, email,
    // role and deviceId — and it must not be taken from the request body.
    return this.enrollmentsService.bulkCreate(dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Update enrollment status (admin only)' })
  @ApiResponse({ status: 200, description: 'Enrollment status updated' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @Put(':enrollmentId/status')
  async updateStatus(
    @Param('enrollmentId') enrollmentId: string,
    @Body('status') status: 'ACTIVE' | 'COMPLETED' | 'REVOKED',
    @CurrentUser() user: { role: string },
  ) {
    return this.enrollmentsService.updateStatus(enrollmentId, status, user.role);
  }

  @ApiOperation({ summary: 'Delete an enrollment' })
  @ApiResponse({ status: 200, description: 'Enrollment deleted successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @Delete(':enrollmentId')
  async delete(@Param('enrollmentId') enrollmentId: string, @CurrentUser() user: { role: string }) {
    return this.enrollmentsService.delete(enrollmentId, user.role);
  }
}

