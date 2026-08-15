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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { FilterSubscribersDto } from './dto/filter-subscribers.dto';

@ApiTags('admin/subscribers')
@Controller('subscribers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class SubscribersController {
  constructor(private readonly service: SubscribersService) {}

  @Get()
  @ApiOperation({ summary: 'List newsletter subscribers (paginated)' })
  findAll(@Query() query: FilterSubscribersDto) {
    return this.service.findAll(query);
  }

  @Get(':subscriberId')
  @ApiOperation({ summary: 'Get a single subscriber' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('subscriberId') subscriberId: string) {
    return this.service.findOne(subscriberId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a subscriber' })
  @ApiResponse({ status: 409, description: 'Email already subscribed' })
  create(@Body() dto: CreateSubscriberDto) {
    return this.service.create(dto);
  }

  @Patch(':subscriberId')
  @ApiOperation({ summary: 'Update a subscriber' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Email already taken' })
  update(@Param('subscriberId') subscriberId: string, @Body() dto: UpdateSubscriberDto) {
    return this.service.update(subscriberId, dto);
  }

  @Delete(':subscriberId')
  @ApiOperation({ summary: 'Delete a subscriber' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('subscriberId') subscriberId: string) {
    return this.service.remove(subscriberId);
  }
}
