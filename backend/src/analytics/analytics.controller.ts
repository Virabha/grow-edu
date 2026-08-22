import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { TrendFilterDto, TopBatchesFilterDto } from './dto/analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get enrollment statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Enrollment statistics' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @Get('enrollments')
  async getEnrollmentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: { role: string },
  ) {
    return this.analyticsService.getEnrollmentStats(user?.role || '', {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Revenue statistics' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get('revenue')
  async getRevenueStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: { role: string },
  ) {
    return this.analyticsService.getRevenueStats(user?.role || '', {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get batch performance metrics' })
  @ApiResponse({ status: 200, description: 'Batch performance data' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @Get('batches/:batchId')
  async getBatchPerformance(
    @Param('batchId') batchId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.analyticsService.getBatchPerformance(batchId, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({ status: 200, description: 'Platform statistics' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get('platform')
  async getPlatformStats(@CurrentUser() user: { role: string }) {
    return this.analyticsService.getPlatformStats(user.role);
  }

  @ApiOperation({ summary: 'Get instructor revenue stats' })
  @ApiResponse({ status: 200, description: 'Instructor revenue statistics' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @Get('instructor-revenue')
  async getInstructorRevenueStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: { userId: string; role: string },
  ) {
    return this.analyticsService.getInstructorRevenueStats(user?.userId || '', user?.role || '', {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get enrollment trend' })
  @ApiResponse({ status: 200, description: 'Enrollment trend data' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @Get('enrollment-trend')
  async getEnrollmentTrend(
    @Query() query: TrendFilterDto,
    @CurrentUser() user?: { role: string },
  ) {
    return this.analyticsService.getEnrollmentTrend(user?.role || '', {
      period: query.period,
      days: query.days ? Number(query.days) : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get revenue trend' })
  @ApiResponse({ status: 200, description: 'Revenue trend data' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get('revenue-trend')
  async getRevenueTrend(
    @Query() query: TrendFilterDto,
    @CurrentUser() user?: { role: string },
  ) {
    return this.analyticsService.getRevenueTrend(user?.role || '', {
      period: query.period,
      days: query.days ? Number(query.days) : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get top batches' })
  @ApiResponse({ status: 200, description: 'Top batches data' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @Get('top-batches')
  async getTopBatches(
    @Query() query: TopBatchesFilterDto,
    @CurrentUser() user?: { role: string },
  ) {
    return this.analyticsService.getTopBatches(user?.role || '', {
      limit: query.limit ? Number(query.limit) : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }
}

