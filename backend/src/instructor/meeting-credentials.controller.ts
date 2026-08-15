import { Controller, Get, Put, Delete, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MeetingCredentialsService } from './meeting-credentials.service';
import { UpsertZoomCredentialsDto } from './dto/upsert-zoom-credentials.dto';
import { UpsertJitsiCredentialsDto } from './dto/upsert-jitsi-credentials.dto';

@ApiTags('instructor')
@Controller('instructor/meeting-credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class MeetingCredentialsController {
  constructor(private readonly meetingCredentialsService: MeetingCredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'Get meeting credential status (no secrets returned)' })
  getMeetingCredentials(@CurrentUser() user: { userId: string }) {
    return this.meetingCredentialsService.getMeetingCredentials(user.userId);
  }

  @Put('zoom')
  @ApiOperation({ summary: 'Upsert Zoom credentials (empty secret = leave unchanged)' })
  upsertZoom(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpsertZoomCredentialsDto,
  ) {
    return this.meetingCredentialsService.upsertZoomCredentials(user.userId, dto);
  }

  @Delete('zoom')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear Zoom credentials' })
  clearZoom(@CurrentUser() user: { userId: string }) {
    return this.meetingCredentialsService.clearZoomCredentials(user.userId);
  }

  @Put('jitsi')
  @ApiOperation({ summary: 'Upsert Jitsi credentials (empty key = leave unchanged)' })
  upsertJitsi(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpsertJitsiCredentialsDto,
  ) {
    return this.meetingCredentialsService.upsertJitsiCredentials(user.userId, dto);
  }

  @Delete('jitsi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear Jitsi credentials' })
  clearJitsi(@CurrentUser() user: { userId: string }) {
    return this.meetingCredentialsService.clearJitsiCredentials(user.userId);
  }
}
