import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscribeService } from './subscribe.service';
import { CreateSubscribeDto } from './dto/create-subscribe.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('subscribe')
@Controller('subscribe')
@Public()
export class SubscribeController {
  constructor(private readonly subscribeService: SubscribeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Subscribe to newsletter (public)' })
  @ApiResponse({ status: 201, description: 'Subscribed successfully' })
  create(@Body() dto: CreateSubscribeDto) {
    return this.subscribeService.create(dto);
  }
}
