import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { GoogleSignInService } from './google-sign-in.service';

@Controller('auth/google')
@Public()
export class GoogleSignInController {
  constructor(
    private readonly googleSignIn: GoogleSignInService,
    private readonly authService: AuthService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() dto: GoogleSignInDto,
    @Request() req: { headers: Record<string, string>; ip?: string },
  ) {
    const userId = await this.googleSignIn.signIn(dto.idToken);
    const user = await this.authService.payloadFor(userId);
    const deviceId = await this.authService.upsertDevice(
      user,
      req.headers['user-agent'] ?? null,
      req.ip ?? null,
    );
    return this.authService.login(user, deviceId);
  }
}
