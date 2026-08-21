import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Authenticated } from './decorators/authenticated.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles, UserRole } from './decorators/roles.decorator';
import {
  ConfirmSecondFactorDto,
  DisableSecondFactorDto,
} from './dto/second-factor.dto';
import { SecondFactorService, requiresSecondFactor } from './second-factor.service';

interface AuthedUser {
  userId: string;
  email: string;
  role: string;
}

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth/second-factor')
export class SecondFactorController {
  constructor(private readonly secondFactor: SecondFactorService) {}

  @Authenticated()
  @ApiOperation({ summary: 'Whether this account has a second factor' })
  @Get()
  async status(@CurrentUser() user: AuthedUser) {
    const enrolment = await this.secondFactor.enrolmentFor(user.userId);
    return {
      enrolled: enrolment?.confirmedAt !== null && enrolment !== null,
      required: requiresSecondFactor(user.role),
      recoveryCodesRemaining: enrolment?.recoveryCodes.length ?? 0,
    };
  }

  @Authenticated()
  @ApiOperation({ summary: 'Start setting up a second factor' })
  @ApiResponse({ status: 201, description: 'Secret and recovery codes issued' })
  @Post('setup')
  begin(@CurrentUser() user: AuthedUser) {
    return this.secondFactor.begin(user.userId, user.email);
  }

  @Authenticated()
  @ApiOperation({ summary: 'Confirm the second factor with a code' })
  @HttpCode(HttpStatus.OK)
  @Post('confirm')
  confirm(
    @Body() dto: ConfirmSecondFactorDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.secondFactor.confirm(user.userId, dto.code);
  }

  @Authenticated()
  @ApiOperation({ summary: 'Turn off your own second factor (students only)' })
  @HttpCode(HttpStatus.OK)
  @Post('disable')
  disable(
    @Body() dto: DisableSecondFactorDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.secondFactor.disable(user.userId, dto.code);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: "Clear a staff member's second factor so they can set up a new one",
  })
  @HttpCode(HttpStatus.OK)
  @Delete('of/:userId')
  reset(@Param('userId') userId: string, @CurrentUser() user: AuthedUser) {
    return this.secondFactor.reset(userId, user.userId);
  }
}
