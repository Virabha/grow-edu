import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { Authenticated } from './decorators/authenticated.decorator';
import { LinkGoogleDto, LinkPhoneDto } from './dto/identity.dto';
import { GoogleSignInService } from './google-sign-in.service';
import { IdentityService } from './identity.service';
import { PhoneSignInService } from './phone-sign-in.service';

@Controller('auth/identities')
@Authenticated()
export class IdentityController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly phoneSignIn: PhoneSignInService,
    private readonly googleSignIn: GoogleSignInService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Request() req: { user: { userId: string } }) {
    return this.identityService.listIdentities(req.user.userId);
  }

  @Post('link/phone')
  @HttpCode(HttpStatus.NO_CONTENT)
  async linkPhone(
    @Body() dto: LinkPhoneDto,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    await this.phoneSignIn.verifyCodeOnly(dto.phone, dto.code);
    await this.identityService.linkIdentity(req.user.userId, 'PHONE', dto.phone);
  }

  @Post('link/google')
  @HttpCode(HttpStatus.NO_CONTENT)
  async linkGoogle(
    @Body() dto: LinkGoogleDto,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    const claims = await this.googleSignIn.verifyClaims(dto.idToken);
    await this.identityService.linkIdentity(
      req.user.userId,
      'GOOGLE',
      claims.subject,
    );
  }

  @Delete(':provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlink(
    @Param('provider') provider: string,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    if (provider !== 'PHONE' && provider !== 'GOOGLE') {
      throw new BadRequestException(
        'Provider must be PHONE or GOOGLE',
      );
    }
    await this.identityService.unlinkIdentity(req.user.userId, provider);
  }
}
