import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateQuizQuestionsDto } from './dto/update-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('lessons')
@Controller('lessons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @ApiOperation({ summary: 'Create a new lesson' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  @Post()
  async create(
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.lessonsService.create(dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Reorder lessons in a section' })
  @ApiResponse({ status: 200, description: 'Lessons reordered successfully' })
  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @Body() dto: ReorderLessonsDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.lessonsService.reorder(dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Get lesson by ID' })
  @ApiResponse({ status: 200, description: 'Lesson details' })
  @Get(':lessonId')
  async getById(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.lessonsService.getById(lessonId, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Update lesson' })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  @Put(':lessonId')
  async update(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.lessonsService.update(lessonId, dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Delete lesson' })
  @ApiResponse({ status: 200, description: 'Lesson deleted successfully' })
  @Delete(':lessonId')
  async delete(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.lessonsService.delete(lessonId, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Approve lesson (Admin only)' })
  @ApiResponse({ status: 200, description: 'Lesson approved' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(':lessonId/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: { role: string },
  ) {
    return this.lessonsService.approve(lessonId, user.role);
  }

  @ApiOperation({ summary: 'Update quiz questions' })
  @ApiResponse({ status: 200, description: 'Quiz questions updated' })
  @Post(':lessonId/quiz-questions')
  @HttpCode(HttpStatus.OK)
  async updateQuizQuestions(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateQuizQuestionsDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.lessonsService.updateQuizQuestions(lessonId, dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Get playback URL for lesson' })
  @ApiResponse({ status: 200, description: 'Playback URL generated' })
  @Get(':lessonId/play')
  async getPlaybackUrl(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.lessonsService.getPlaybackUrl(lessonId, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Get preview URL for free preview lessons (public)' })
  @ApiResponse({ status: 200, description: 'Preview URL generated' })
  @Public()
  @Get(':lessonId/preview')
  async getPreviewUrl(@Param('lessonId') lessonId: string) {
    return this.lessonsService.getPreviewUrl(lessonId);
  }
}
