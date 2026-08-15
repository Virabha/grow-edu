import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { CreateSectionDto, UpdateSectionDto, ReorderSectionsDto } from './dto/section.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('sections')
@Controller('sections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @ApiOperation({ summary: 'Create a new section' })
  @ApiResponse({ status: 201, description: 'Section created successfully' })
  @Post()
  async create(
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.sectionsService.create(dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Reorder sections' })
  @ApiResponse({ status: 200, description: 'Sections reordered successfully' })
  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @Body() dto: ReorderSectionsDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.sectionsService.reorder(dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Get all sections for a course' })
  @ApiResponse({ status: 200, description: 'List of sections' })
  @Get('course/:courseId')
  async getAll(@Param('courseId') courseId: string) {
    return this.sectionsService.getAll(courseId);
  }

  @ApiOperation({ summary: 'Update section' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  @Put(':sectionId')
  async update(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.sectionsService.update(sectionId, dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Delete section' })
  @ApiResponse({ status: 200, description: 'Section deleted successfully' })
  @Delete(':sectionId')
  async delete(
    @Param('sectionId') sectionId: string,
    @Query('courseId') courseId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.sectionsService.delete(sectionId, courseId, user.userId, user.role);
  }
}
