import {
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LowBandwidthService } from './low-bandwidth.service';
import { SetLowBandwidthDto } from './dto/low-bandwidth.dto';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('low-bandwidth')
@Controller()
export class LowBandwidthController {
  constructor(private readonly service: LowBandwidthService) {}

  @ApiOperation({ summary: 'Get low-bandwidth mode setting for the current user' })
  @Get('me/low-bandwidth')
  @Authenticated()
  async getSetting(@CurrentUser() user: AuthedUser) {
    return this.service.getSetting(user.userId);
  }

  @ApiOperation({ summary: 'Set low-bandwidth mode for the current user' })
  @Put('me/low-bandwidth')
  @Authenticated()
  async setSetting(
    @CurrentUser() user: AuthedUser,
    @Body() dto: SetLowBandwidthDto,
  ) {
    return this.service.setSetting(user.userId, dto.lowBandwidth);
  }

  @ApiOperation({ summary: 'Get lesson playback info respecting low-bandwidth mode' })
  @Get('batches/:batchId/lessons/:lessonId/playback')
  @BatchAccess('READ')
  async getPlayback(
    @Param('batchId') batchId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.service.getLessonPlayback(lessonId, batchId, user);
  }
}
