import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClaimSeatDto } from './dto/claim-seat.dto';
import { RedeemJoinLinkDto } from './dto/redeem-join-link.dto';
import { SeatsService } from './seats.service';

@ApiTags('corporate')
@Controller('corporate/join')
export class JoinController {
  constructor(private readonly seats: SeatsService) {}

  @ApiOperation({ summary: 'Claim a contract seat with a join link' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  @Post('claim')
  claim(@Body() dto: ClaimSeatDto) {
    return this.seats.claimWithNewAccount(dto);
  }
}
