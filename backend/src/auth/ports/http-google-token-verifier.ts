import { Injectable } from '@nestjs/common';
import { GoogleTokenClaims, GoogleTokenVerifier } from './google-token-verifier';

@Injectable()
export class HttpGoogleTokenVerifier implements GoogleTokenVerifier {
  async verify(idToken: string): Promise<GoogleTokenClaims | null> {
    try {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = (await response.json()) as Record<string, unknown>;
      if (typeof data['sub'] !== 'string' || typeof data['email'] !== 'string') {
        return null;
      }
      return {
        subject: data['sub'],
        email: data['email'],
        emailVerified: data['email_verified'] === 'true',
      };
    } catch {
      return null;
    }
  }
}
