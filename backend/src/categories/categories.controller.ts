import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FilterCategoriesAdminDto } from './dto/filter-categories.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all categories (public)' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug (public)' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories with filters (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of categories' })
  async findAllAdmin(@Query() query: FilterCategoriesAdminDto) {
    return this.categoriesService.findAllAdmin({
      search: query.search,
      isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin)' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate category (admin)' })
  async activate(@Param('id') id: string) {
    return this.categoriesService.activate(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate category (admin)' })
  async deactivate(@Param('id') id: string) {
    return this.categoriesService.deactivate(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete category (admin)' })
  async softDelete(@Param('id') id: string) {
    return this.categoriesService.softDelete(id);
  }
}

