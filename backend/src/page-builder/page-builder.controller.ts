import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PageBuilderService } from './page-builder.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('pages')
@Controller('pages')
@UseGuards(JwtAuthGuard)
export class PageBuilderController {
  constructor(private readonly service: PageBuilderService) {}

  @Get('palette')
  @Public()
  @ApiOperation({ summary: 'List available block kinds' })
  getPalette() {
    return this.service.getPalette();
  }

  @Get('public/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a published page by slug (public, includes metadata)' })
  @ApiResponse({ status: 404, description: 'Not found or not published' })
  getPublicPage(@Param('slug') slug: string) {
    return this.service.getPublicPageBySlug(slug);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all pages (admin)' })
  listPages() {
    return this.service.listPages();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new page (admin)' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  createPage(@Body() dto: CreatePageDto) {
    return this.service.createPage(dto, (dto.blocks as unknown[] | undefined) ?? []);
  }

  @Get(':pageId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get page by ID (admin)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getPage(@Param('pageId') pageId: string) {
    return this.service.getPage(pageId);
  }

  @Patch(':pageId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a page (admin) — does not publish' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  updatePage(
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.service.updatePage(pageId, dto, dto.blocks);
  }

  @Post(':pageId/publish')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a page (explicit action)' })
  publishPage(@Param('pageId') pageId: string) {
    return this.service.publishPage(pageId);
  }

  @Post(':pageId/unpublish')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a page (returns it to draft)' })
  unpublishPage(@Param('pageId') pageId: string) {
    return this.service.unpublishPage(pageId);
  }

  @Delete(':pageId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a page (admin)' })
  deletePage(@Param('pageId') pageId: string) {
    return this.service.deletePage(pageId);
  }
}
