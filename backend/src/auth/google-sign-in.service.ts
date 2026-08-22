import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  GOOGLE_TOKEN_VERIFIER,
  GoogleTokenClaims,
  GoogleTokenVerifier,
} from './ports/google-token-verifier';
import { IdentityService } from './identity.service';

export const GOOGLE_SIGN_IN_INVALID = 'GOOGLE_SIGN_IN_INVALID';

@Injectable()
export class GoogleSignInService {
  constructor(
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly verifier: GoogleTokenVerifier,
    private readonly identityService: IdentityService,
  ) {}

  async signIn(idToken: string): Promise<string> {
    const claims = await this.verifyClaims(idToken);

    const existing = await this.identityService.resolveByIdentity(
      'GOOGLE',
      claims.subject,
    );
    if (existing) {
      await this.identityService.touchLastUsed(existing, 'GOOGLE');
      return existing;
    }

    const byEmail = await this.identityService.resolveByEmail(claims.email);
    if (byEmail) {
      await this.identityService.linkIdentity(byEmail, 'GOOGLE', claims.subject);
      await this.identityService.touchLastUsed(byEmail, 'GOOGLE');
      return byEmail;
    }

    return this.identityService.createUserWithIdentity(
      'GOOGLE',
      claims.subject,
      claims.email,
    );
  }

  async verifyClaims(idToken: string): Promise<GoogleTokenClaims> {
    const claims = await this.verifier.verify(idToken);
    if (!claims || !claims.emailVerified) {
      throw new UnauthorizedException({
        code: GOOGLE_SIGN_IN_INVALID,
        message: 'Sign-in failed',
      });
    }
    return claims;
  }
}
