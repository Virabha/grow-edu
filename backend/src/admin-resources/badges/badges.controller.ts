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
import { BadgesService } from './badges.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { FilterBadgesDto } from './dto/filter-badges.dto';

@ApiTags('badges')
@Controller('badges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @ApiOperation({ summary: 'List instructor badges (paginated)' })
  findAll(@Query() query: FilterBadgesDto) {
    return this.badgesService.findAll({
      search: query.search,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':badgeId')
  @ApiOperation({ summary: 'Get a badge by id' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  findOne(@Param('badgeId') badgeId: string) {
    return this.badgesService.findOne(badgeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a badge' })
  create(@Body() dto: CreateBadgeDto) {
    return this.badgesService.create(dto);
  }

  @Patch(':badgeId')
  @ApiOperation({ summary: 'Update a badge' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  update(@Param('badgeId') badgeId: string, @Body() dto: UpdateBadgeDto) {
    return this.badgesService.update(badgeId, dto);
  }

  @Delete(':badgeId')
  @ApiOperation({ summary: 'Delete a badge' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  remove(@Param('badgeId') badgeId: string) {
    return this.badgesService.remove(badgeId);
  }
}
