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
import { SocialLinksService } from './social-links.service';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';
import { FilterSocialLinksDto } from './dto/filter-social-links.dto';

@ApiTags('social-links')
@Controller('social-links')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class SocialLinksController {
  constructor(private readonly socialLinksService: SocialLinksService) {}

  @Get()
  @ApiOperation({ summary: 'List social links (paginated)' })
  findAll(@Query() query: FilterSocialLinksDto) {
    return this.socialLinksService.findAll({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':socialLinkId')
  @ApiOperation({ summary: 'Get a social link by id' })
  @ApiResponse({ status: 404, description: 'Social link not found' })
  findOne(@Param('socialLinkId') socialLinkId: string) {
    return this.socialLinksService.findOne(socialLinkId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a social link' })
  create(@Body() dto: CreateSocialLinkDto) {
    return this.socialLinksService.create(dto);
  }

  @Patch(':socialLinkId')
  @ApiOperation({ summary: 'Update a social link' })
  @ApiResponse({ status: 404, description: 'Social link not found' })
  update(@Param('socialLinkId') socialLinkId: string, @Body() dto: UpdateSocialLinkDto) {
    return this.socialLinksService.update(socialLinkId, dto);
  }

  @Delete(':socialLinkId')
  @ApiOperation({ summary: 'Delete a social link' })
  @ApiResponse({ status: 404, description: 'Social link not found' })
  remove(@Param('socialLinkId') socialLinkId: string) {
    return this.socialLinksService.remove(socialLinkId);
  }
}
