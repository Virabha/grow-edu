import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TeacherApplicationsService } from './teacher-applications.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { UpdateTeacherApplicationStatusDto } from './dto/update-status.dto';
import { FilterTeacherApplicationsDto } from './dto/filter-teacher-applications.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('teacher-applications')
@Controller('teacher-applications')
export class TeacherApplicationsController {
  constructor(
    private readonly teacherApplicationsService: TeacherApplicationsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @Public()
  @Throttle({ default: { ttl: 60_000 * 60, limit: 3 } })
  @ApiOperation({ summary: 'Submit teacher application (public)' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  create(@Body() dto: CreateTeacherApplicationDto) {
    return this.teacherApplicationsService.create(dto);
  }

  @Post('upload-cv')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload CV for teacher application (public)' })
  @ApiResponse({ status: 201, description: 'Returns { url } for cvUrl' })
  async uploadCv(@UploadedFile() file: { buffer: Buffer; mimetype: string; originalname?: string }) {
    if (!file) throw new BadRequestException('No file provided');
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: PDF, JPEG, PNG, WebP',
      );
    }
    const ext = file.originalname?.split('.').pop() || 'pdf';
    const key = `teacher-applications/cv/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    await this.storageService.uploadFile(file.buffer, key, file.mimetype);
    const url = this.storageService.getCdnUrl(key);
    return { url, key };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List applications with filters (admin)' })
  findAllAdmin(@Query() query: FilterTeacherApplicationsDto) {
    return this.teacherApplicationsService.findAllAdmin({
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':applicationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get application by ID (admin)' })
  findOne(@Param('applicationId') applicationId: string) {
    return this.teacherApplicationsService.findOne(applicationId);
  }

  @Patch(':applicationId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update application status (admin)' })
  updateStatus(
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateTeacherApplicationStatusDto,
  ) {
    return this.teacherApplicationsService.updateStatus(applicationId, dto.status);
  }
}
