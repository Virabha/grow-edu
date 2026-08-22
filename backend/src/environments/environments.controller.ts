import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnvironmentsService } from './environments.service';

class ProvisionEnvironmentDto {
  @IsString()
  @IsNotEmpty()
  stageId: string;
}

@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly environments: EnvironmentsService) {}

  @Post()
  @Authenticated()
  async provisionOrResume(
    @Body() dto: ProvisionEnvironmentDto,
    @CurrentUser() user: { userId: string },
  ): Promise<unknown> {
    return this.environments.provisionOrResume(user.userId, dto.stageId);
  }

  @Get('me/usage')
  @Authenticated()
  async getMyUsage(
    @CurrentUser() user: { userId: string },
  ): Promise<unknown> {
    return this.environments.getUsageSummary(user.userId);
  }

  @Get(':environmentId')
  @Authenticated()
  async getEnvironment(
    @Param('environmentId') environmentId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<unknown> {
    return this.environments.getForUser(environmentId, user.userId);
  }

  @Post(':environmentId/heartbeat')
  @Authenticated()
  @HttpCode(200)
  async heartbeat(
    @Param('environmentId') environmentId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<{ acknowledged: boolean }> {
    await this.environments.heartbeat(environmentId, user.userId);
    return { acknowledged: true };
  }

  @Post(':environmentId/hibernate')
  @Authenticated()
  @HttpCode(200)
  async hibernate(
    @Param('environmentId') environmentId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<{ status: string }> {
    await this.environments.manualHibernate(environmentId, user.userId);
    return { status: 'HIBERNATED' };
  }
}
