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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
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
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'COMPLETED', 'REVOKED'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by user name, email, or course title' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  @Get()
  async findAll(@Query() query: Record<string, string>, @CurrentUser() user: { userId: string; role: string }): Promise<any> {
    // Non-admins can only see their own enrollments
    const filters: Record<string, any> = { ...query };
    if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CORPORATE_ADMIN') {
      filters.userId = user.userId;
    }

    return this.enrollmentsService.findAll({
      userId: filters.userId,
      courseId: filters.courseId,
      companyId: filters.companyId,
      status: filters.status,
      search: filters.search,
      page: filters.page ? parseInt(filters.page) : undefined,
      limit: filters.limit ? parseInt(filters.limit) : undefined,
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
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.enrollmentsService.findOne(id, user.userId, user.role);
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

  @ApiOperation({ summary: 'Bulk create enrollments' })
  @ApiResponse({ status: 201, description: 'Bulk enrollment completed' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.CORPORATE_ADMIN, UserRole.PLATFORM_ADMIN)
  @Post('bulk')
  async bulkCreate(
    @Body() dto: BulkEnrollmentDto,
    @CurrentUser() user: { userId: string; role: string; companyId?: string },
  ) {
    return this.enrollmentsService.bulkCreate(dto, user.companyId || '', user.role);
  }

  @ApiOperation({ summary: 'Update enrollment status (admin only)' })
  @ApiResponse({ status: 200, description: 'Enrollment status updated' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'COMPLETED' | 'REVOKED',
    @CurrentUser() user: { role: string },
  ) {
    return this.enrollmentsService.updateStatus(id, status, user.role);
  }

  @ApiOperation({ summary: 'Delete an enrollment' })
  @ApiResponse({ status: 200, description: 'Enrollment deleted successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: { role: string }) {
    return this.enrollmentsService.delete(id, user.role);
  }
}

