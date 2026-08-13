import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FilterCategoriesAdminDto } from './dto/filter-categories.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('admin/categories')
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories (admin view)' })
  async findAll(@Query() query: FilterCategoriesAdminDto) {
    return this.categoriesService.findAllAdmin({
      search: query.search,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      parentCategoryId: query.parentCategoryId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get category details by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findOne(categoryId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category already exists' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':categoryId')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name/slug already exists' })
  async update(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(categoryId, dto);
  }

  @Patch(':categoryId/activate')
  @ApiOperation({ summary: 'Activate a category' })
  @ApiResponse({ status: 200, description: 'Category activated' })
  async activate(@Param('categoryId') categoryId: string) {
    return this.categoriesService.activate(categoryId);
  }

  @Patch(':categoryId/deactivate')
  @ApiOperation({ summary: 'Deactivate a category' })
  @ApiResponse({ status: 200, description: 'Category deactivated' })
  async deactivate(@Param('categoryId') categoryId: string) {
    return this.categoriesService.deactivate(categoryId);
  }

  @Delete(':categoryId')
  @ApiOperation({ summary: 'Soft delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async remove(@Param('categoryId') categoryId: string) {
    return this.categoriesService.softDelete(categoryId);
  }
}
