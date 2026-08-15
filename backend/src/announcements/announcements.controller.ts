import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('announcements')
@Controller('')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // ── IMPORTANT: /announcements/mine MUST be declared before /announcements/:id ──

  @ApiOperation({ summary: 'List all announcements across my courses (paginated)' })
  @ApiResponse({ status: 200 })
  @Get('announcements/mine')
  listMine(
    @CurrentUser() user: { userId: string; role: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.announcementsService.listMine(user, pagination);
  }

  @ApiOperation({ summary: 'Post an announcement to a course' })
  @ApiResponse({ status: 201 })
  @Post('courses/:courseId/announcements')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.create(courseId, dto, user);
  }

  @ApiOperation({ summary: 'List announcements for a course' })
  @ApiResponse({ status: 200 })
  @Get('courses/:courseId/announcements')
  listByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.listByCourse(courseId, user);
  }

  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200 })
  @Patch('announcements/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiResponse({ status: 200 })
  @Delete('announcements/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.remove(id, user);
  }
}
