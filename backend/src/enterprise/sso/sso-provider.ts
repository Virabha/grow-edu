export const SSO_PROVIDER = "SSO_PROVIDER";

export interface SsoTokenClaims {
  subject: string;
  email: string;
  emailVerified: boolean;
}

export interface SsoProvider {
  verify(companyId: string, token: string): Promise<SsoTokenClaims | null>;
}

export class HttpSsoProvider implements SsoProvider {
  async verify(companyId: string, token: string): Promise<SsoTokenClaims | null> {
    const baseUrl = process.env.SSO_VERIFICATION_URL ?? "";
    if (!baseUrl) {
      throw new Error("SSO_VERIFICATION_URL is not configured");
    }
    const response = await fetch(`${baseUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, token }),
    });
    if (!response.ok) {
      return null;
    }
    return response.json() as Promise<SsoTokenClaims>;
  }
}
