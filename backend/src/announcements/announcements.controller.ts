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

  // ── ResourcePage contract ────────────────────────────────────────────────
  // IMPORTANT: /announcements/mine and /announcements (list) MUST be declared
  // before /announcements/:id to avoid the literal "mine" matching as an id.

  @ApiOperation({ summary: 'List announcements — ResourcePage flat GET (instructor or admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list with id mapped from announcementId' })
  @Get('announcements')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  listPage(
    @CurrentUser() user: { userId: string; role: string },
    @Query() query: PaginationDto & { search?: string; courseId?: string },
  ) {
    return this.announcementsService.listPage(user, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      courseId: query.courseId,
    });
  }

  @ApiOperation({ summary: 'List all announcements across my courses (paginated)' })
  @ApiResponse({ status: 200 })
  @Get('announcements/mine')
  listMine(
    @CurrentUser() user: { userId: string; role: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.announcementsService.listMine(user, pagination);
  }

  @ApiOperation({ summary: 'Get a single announcement — ResourcePage GET /:id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found or not owned by caller' })
  @Get('announcements/:id')
  findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.findById(id, user);
  }

  @ApiOperation({ summary: 'Create announcement — ResourcePage flat POST (courseId in body)' })
  @ApiResponse({ status: 201 })
  @Post('announcements')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  createFromResource(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.createFromResource(dto, user);
  }

  // ── Legacy course-scoped routes (kept for learner access and other clients) ─

  @ApiOperation({ summary: 'Post an announcement to a course (course-scoped route)' })
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
