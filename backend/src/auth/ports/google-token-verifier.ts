export const GOOGLE_TOKEN_VERIFIER = 'GOOGLE_TOKEN_VERIFIER';

export interface GoogleTokenClaims {
  subject: string;
  email: string;
  emailVerified: boolean;
}

export interface GoogleTokenVerifier {
  verify(idToken: string): Promise<GoogleTokenClaims | null>;
}
