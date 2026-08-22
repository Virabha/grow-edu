import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { RequestPhoneCodeDto, VerifyPhoneCodeDto } from './dto/phone-sign-in.dto';
import { PerPhoneThrottlerGuard } from './guards/per-phone-throttler.guard';
import { PhoneSignInService } from './phone-sign-in.service';

@Controller('auth/phone')
@Public()
export class PhoneSignInController {
  constructor(
    private readonly phoneSignIn: PhoneSignInService,
    private readonly authService: AuthService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @UseGuards(PerPhoneThrottlerGuard)
  @Post('request-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestCode(
    @Body() dto: RequestPhoneCodeDto,
    @Request() req: { ip?: string },
  ): Promise<void> {
    await this.phoneSignIn.requestCode(dto.phone, req.ip ?? null);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() dto: VerifyPhoneCodeDto,
    @Request() req: { headers: Record<string, string>; ip?: string },
  ) {
    const userId = await this.phoneSignIn.verifyCode(dto.phone, dto.code);
    const user = await this.authService.payloadFor(userId);
    const deviceId = await this.authService.upsertDevice(
      user,
      req.headers['user-agent'] ?? null,
      req.ip ?? null,
    );
    return this.authService.login(user, deviceId);
  }
}
