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
import { WithdrawMethodsService } from './withdraw-methods.service';
import { CreateWithdrawMethodDto } from './dto/create-withdraw-method.dto';
import { UpdateWithdrawMethodDto } from './dto/update-withdraw-method.dto';
import { FilterWithdrawMethodsDto } from './dto/filter-withdraw-methods.dto';

@ApiTags('admin/withdraw-methods')
@Controller('withdraw-methods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class WithdrawMethodsController {
  constructor(private readonly service: WithdrawMethodsService) {}

  @Get()
  @ApiOperation({ summary: 'List withdraw methods (paginated)' })
  findAll(@Query() query: FilterWithdrawMethodsDto) {
    return this.service.findAll(query);
  }

  @Get(':withdrawMethodId')
  @ApiOperation({ summary: 'Get a single withdraw method' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('withdrawMethodId') withdrawMethodId: string) {
    return this.service.findOne(withdrawMethodId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a withdraw method' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  create(@Body() dto: CreateWithdrawMethodDto) {
    return this.service.create(dto);
  }

  @Patch(':withdrawMethodId')
  @ApiOperation({ summary: 'Update a withdraw method' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('withdrawMethodId') withdrawMethodId: string, @Body() dto: UpdateWithdrawMethodDto) {
    return this.service.update(withdrawMethodId, dto);
  }

  @Delete(':withdrawMethodId')
  @ApiOperation({ summary: 'Delete a withdraw method' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('withdrawMethodId') withdrawMethodId: string) {
    return this.service.remove(withdrawMethodId);
  }
}
