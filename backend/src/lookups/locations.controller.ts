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
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FilterLookupsDto } from './dto/filter-lookups.dto';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List locations (paginated)' })
  findAll(@Query() query: FilterLookupsDto) {
    return this.service.findAll(query);
  }

  @Get(':locationId')
  @ApiOperation({ summary: 'Get a location by id' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('locationId') locationId: string) {
    return this.service.findOne(locationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a location' })
  @ApiResponse({ status: 409, description: 'Duplicate code' })
  create(@Body() dto: CreateLocationDto) {
    return this.service.create(dto);
  }

  @Patch(':locationId')
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Duplicate code' })
  update(@Param('locationId') locationId: string, @Body() dto: UpdateLocationDto) {
    return this.service.update(locationId, dto);
  }

  @Delete(':locationId')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('locationId') locationId: string) {
    return this.service.remove(locationId);
  }
}
