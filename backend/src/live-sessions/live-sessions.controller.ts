import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LiveSessionsService } from './live-sessions.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { FilterLiveSessionsDto } from './dto/filter-live-sessions.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('live-sessions')
@Controller('live-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Get()
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'List own sessions (instructors) or all sessions (admins)' })
  listSessions(
    @CurrentUser() user: AuthedUser,
    @Query() query: FilterLiveSessionsDto,
  ) {
    return this.liveSessionsService.listSessions(user.userId, user.role, query);
  }

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Create a live session' })
  createSession(
    @CurrentUser() user: AuthedUser,
    @Body() dto: CreateLiveSessionDto,
  ) {
    return this.liveSessionsService.createSession(user.userId, dto);
  }

  @Get('upcoming')
  @Roles(UserRole.LEARNER)
  @ApiOperation({ summary: 'Upcoming sessions for courses the learner is enrolled in' })
  getUpcoming(@CurrentUser() user: AuthedUser) {
    return this.liveSessionsService.getUpcoming(user.userId);
  }

  @Get(':liveSessionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get a single session (instructor/admin)' })
  getSession(
    @CurrentUser() user: AuthedUser,
    @Param('liveSessionId') id: string,
  ) {
    return this.liveSessionsService.getSession(user.userId, user.role, id);
  }

  @Patch(':liveSessionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Update a session' })
  updateSession(
    @CurrentUser() user: AuthedUser,
    @Param('liveSessionId') id: string,
    @Body() dto: UpdateLiveSessionDto,
  ) {
    return this.liveSessionsService.updateSession(user.userId, user.role, id, dto);
  }

  @Delete(':liveSessionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a session' })
  deleteSession(
    @CurrentUser() user: AuthedUser,
    @Param('liveSessionId') id: string,
  ) {
    return this.liveSessionsService.deleteSession(user.userId, user.role, id);
  }

  @Get(':liveSessionId/view')
  @Roles(UserRole.LEARNER)
  @ApiOperation({ summary: 'Get session detail for a learner (joinUrl gated)' })
  getSessionForLearner(
    @CurrentUser() user: AuthedUser,
    @Param('liveSessionId') id: string,
  ) {
    return this.liveSessionsService.getSessionForLearner(user.userId, id);
  }

  @Post(':liveSessionId/register')
  @Roles(UserRole.LEARNER)
  @ApiOperation({ summary: 'Register for a session (idempotent)' })
  register(
    @CurrentUser() user: AuthedUser,
    @Param('liveSessionId') id: string,
  ) {
    return this.liveSessionsService.register(user.userId, id);
  }

  @Delete(':liveSessionId/register')
  @Roles(UserRole.LEARNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister from a session' })
  unregister(
    @CurrentUser() user: AuthedUser,
    @Param('liveSessionId') id: string,
  ) {
    return this.liveSessionsService.unregister(user.userId, id);
  }
}
