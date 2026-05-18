import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('progress')
@Controller('progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @ApiOperation({ summary: 'Get course progress' })
  @ApiResponse({ status: 200, description: 'Course progress data' })
  @Get('courses/:courseId')
  async getCourseProgress(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.progressService.getCourseProgress(courseId, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Update course progress' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  @Put('courses/:courseId')
  async updateProgress(
    @Param('courseId') courseId: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.progressService.updateProgress(courseId, user.userId, dto, user.role);
  }
}

