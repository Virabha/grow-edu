import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @Get()
  async findAll(
    @Query() query: FilterUsersDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    // A corporate admin may only ever see their own company's people. The JWT
    // carries no companyId, so the service resolves it from the caller's own
    // record — it can never be widened by a query parameter.
    return this.usersService.findAll(
      {
        role: query.role,
        search: query.search,
        page: query.page,
        limit: query.limit,
      },
      user.role === UserRole.CORPORATE_ADMIN ? user.userId : undefined,
    );
  }

  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @Get('me')
  async getMe(@CurrentUser() user: { userId: string }) {
    return this.usersService.getMe(user.userId);
  }

  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  @Patch('me')
  async updateMe(
    @CurrentUser() user: { userId: string },
    @Body() dto: {
      firstName?: string;
      lastName?: string;
      profileImage?: string | null;
      headline?: string;
      bio?: string;
      phone?: string;
      addressLine?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      social?: Record<string, string>;
    },
  ) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @ApiOperation({ summary: 'Change own password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @Post('me/password')
  async changePassword(
    @CurrentUser() user: { userId: string },
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @ApiOperation({ summary: 'Change own email' })
  @ApiResponse({ status: 200, description: 'Email changed' })
  @Post('me/email')
  async changeEmail(
    @CurrentUser() user: { userId: string },
    @Body() dto: { email: string },
  ) {
    return this.usersService.changeEmail(user.userId, dto.email);
  }

  @ApiOperation({ summary: 'List active devices' })
  @ApiResponse({ status: 200, description: 'Device list' })
  @Get('me/devices')
  listDevices(@CurrentUser() user: { userId: string; deviceId?: string }) {
    return this.usersService.listDevices(user.userId, user.deviceId);
  }

  @ApiOperation({ summary: 'Sign out a device' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @Delete('me/devices/:deviceId')
  signOutDevice(
    @CurrentUser() user: { userId: string },
    @Param('deviceId') deviceId: string,
  ) {
    return this.usersService.revokeDevice(user.userId, deviceId);
  }

  @ApiOperation({ summary: 'Sign out all other devices' })
  @ApiResponse({ status: 200 })
  @Post('me/devices/logout-others')
  signOutOtherDevices(@CurrentUser() user: { userId: string; deviceId?: string }) {
    return this.usersService.revokeOtherDevices(user.userId, user.deviceId);
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':userId')
  async findOne(@Param('userId') userId: string, @CurrentUser() user: { userId: string; role: string }) {
    if (user.role !== 'PLATFORM_ADMIN' && userId !== user.userId) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findOne(userId);
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Put(':userId')
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.usersService.update(userId, dto, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(':userId')
  async delete(@Param('userId') userId: string, @CurrentUser() user: { role: string }) {
    return this.usersService.delete(userId, user.role);
  }
}

