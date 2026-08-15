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
import { SiteLanguagesService } from './site-languages.service';
import { CreateSiteLanguageDto } from './dto/create-site-language.dto';
import { UpdateSiteLanguageDto } from './dto/update-site-language.dto';
import { FilterLookupsDto } from './dto/filter-lookups.dto';

@ApiTags('languages')
@Controller('languages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class SiteLanguagesController {
  constructor(private readonly service: SiteLanguagesService) {}

  @Get()
  @ApiOperation({ summary: 'List site languages (paginated)' })
  findAll(@Query() query: FilterLookupsDto) {
    return this.service.findAll(query);
  }

  @Get(':siteLanguageId')
  @ApiOperation({ summary: 'Get a site language by id' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('siteLanguageId') siteLanguageId: string) {
    return this.service.findOne(siteLanguageId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a site language' })
  @ApiResponse({ status: 409, description: 'Duplicate code' })
  create(@Body() dto: CreateSiteLanguageDto) {
    return this.service.create(dto);
  }

  @Patch(':siteLanguageId')
  @ApiOperation({ summary: 'Update a site language' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Duplicate code' })
  update(@Param('siteLanguageId') siteLanguageId: string, @Body() dto: UpdateSiteLanguageDto) {
    return this.service.update(siteLanguageId, dto);
  }

  @Delete(':siteLanguageId')
  @ApiOperation({ summary: 'Delete a site language' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('siteLanguageId') siteLanguageId: string) {
    return this.service.remove(siteLanguageId);
  }
}
