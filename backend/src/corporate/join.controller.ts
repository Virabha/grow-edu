import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ClaimSeatDto } from './dto/claim-seat.dto';
import { RedeemJoinLinkDto } from './dto/redeem-join-link.dto';
import { SeatsService } from './seats.service';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { PerTokenThrottlerGuard } from '../auth/guards/per-token-throttler.guard';

@ApiTags('corporate')
@Controller('corporate/join')
export class JoinController {
  constructor(private readonly seats: SeatsService) {}

  @Authenticated()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @UseGuards(PerTokenThrottlerGuard)
  @ApiOperation({ summary: 'Claim a contract seat with a join link' })
  @ApiBearerAuth()
  @Post('redeem')
  redeem(
    @Body() dto: RedeemJoinLinkDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.seats.redeem(dto.token, user.userId);
  }

  @ApiOperation({
    summary: 'Create an account and claim a contract seat with a join link',
  })
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @UseGuards(PerTokenThrottlerGuard)
  @Post('claim')
  claim(@Body() dto: ClaimSeatDto) {
    return this.seats.claimWithNewAccount(dto);
  }
}
