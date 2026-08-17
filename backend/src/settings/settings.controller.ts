import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import type { FieldValue } from './settings.types';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':group')
  @ApiOperation({ summary: 'Get a settings group with field schema and current values' })
  getGroup(@Param('group') group: string) {
    return this.settingsService.getGroup(group);
  }

  @Put(':group')
  @ApiOperation({ summary: 'Upsert a settings group (admin only)' })
  putGroup(
    @Param('group') group: string,
    @Body() body: Record<string, FieldValue>,
  ) {
    return this.settingsService.putGroup(group, body);
  }
}
