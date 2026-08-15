import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService, DashboardSummary } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get learner dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary with stats, activity, and recent items' })
  @Get('summary')
  getSummary(@CurrentUser() user: { userId: string }): Promise<DashboardSummary> {
    // userId always comes from the JWT — never accepted from the client
    return this.dashboardService.getSummary(user.userId);
  }
}
