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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles, UserRole } from '../../auth/decorators/roles.decorator';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { FilterBrandsDto } from './dto/filter-brands.dto';

@ApiTags('brands')
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List brands (paginated)' })
  findAll(@Query() query: FilterBrandsDto) {
    return this.brandsService.findAll({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':brandId')
  @ApiOperation({ summary: 'Get a brand by id' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  findOne(@Param('brandId') brandId: string) {
    return this.brandsService.findOne(brandId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a brand' })
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(':brandId')
  @ApiOperation({ summary: 'Update a brand' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  update(@Param('brandId') brandId: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(brandId, dto);
  }

  @Delete(':brandId')
  @ApiOperation({ summary: 'Delete a brand' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  remove(@Param('brandId') brandId: string) {
    return this.brandsService.remove(brandId);
  }
}
