import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CourseLanguagesService } from './course-languages.service';
import { CreateCourseLanguageDto } from './dto/create-course-language.dto';
import { UpdateCourseLanguageDto } from './dto/update-course-language.dto';
import { FilterLookupsDto } from './dto/filter-lookups.dto';

@ApiTags('course-languages')
@Controller('course-languages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class CourseLanguagesController {
  constructor(private readonly service: CourseLanguagesService) {}

  @Get()
  @ApiOperation({ summary: 'List course languages (paginated)' })
  findAll(@Query() query: FilterLookupsDto) {
    return this.service.findAll(query);
  }

  @Get(':courseLanguageId')
  @ApiOperation({ summary: 'Get a course language by id' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('courseLanguageId') courseLanguageId: string) {
    return this.service.findOne(courseLanguageId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a course language' })
  @ApiResponse({ status: 409, description: 'Duplicate code' })
  create(@Body() dto: CreateCourseLanguageDto) {
    return this.service.create(dto);
  }

  @Patch(':courseLanguageId')
  @ApiOperation({ summary: 'Update a course language' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Duplicate code' })
  update(@Param('courseLanguageId') courseLanguageId: string, @Body() dto: UpdateCourseLanguageDto) {
    return this.service.update(courseLanguageId, dto);
  }

  @Delete(':courseLanguageId')
  @ApiOperation({ summary: 'Delete a course language' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('courseLanguageId') courseLanguageId: string) {
    return this.service.remove(courseLanguageId);
  }
}
