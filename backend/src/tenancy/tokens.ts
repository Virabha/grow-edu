/**
 * Access tokens.
 *
 * The token carries identity ONLY — who you are, and whether you are platform
 * staff. It deliberately does not carry an organisation or an organisation
 * role, because both are resolved per request from the host and the membership
 * table [D-035d].
 *
 * Putting the org role in the token would reintroduce exactly the bug
 * [D-035d] removes: a token minted while acting as an instructor in
 * organisation B would still assert "instructor" when presented to
 * organisation A. It would also mean a revoked membership stays valid until
 * the token expires.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import type { PlatformRole, TokenClaims } from "./context";

const ALG = "HS256";

export interface TokenConfig {
  secret: Uint8Array;
  issuer: string;
  /** Access token lifetime. Short by design — memberships change. */
  ttlSeconds?: number;
}

export function secretFrom(value: string): Uint8Array {
  if (value.length < 32) {
    throw new Error("token secret must be at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export async function issueAccessToken(
  claims: TokenClaims,
  config: TokenConfig,
): Promise<string> {
  const payload: JWTPayload = { sub: claims.userId };
  if (claims.platformRole) payload["prole"] = claims.platformRole;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(config.issuer)
    .setExpirationTime(`${config.ttlSeconds ?? 900}s`)
    .sign(config.secret);
}

/**
 * Returns null on any failure — expired, tampered, wrong issuer, malformed.
 * Callers treat null as unauthenticated; there is nothing useful to
 * distinguish, and distinguishing leaks information.
 */
export async function verifyAccessToken(
  token: string | undefined | null,
  config: TokenConfig,
): Promise<TokenClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, config.secret, {
      issuer: config.issuer,
      algorithms: [ALG],
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub) return null;

    // Equality against the literals narrows `unknown` on its own — no cast.
    const prole: unknown = payload["prole"];
    const platformRole: PlatformRole | null =
      prole === "PLATFORM_SUPPORT" || prole === "PLATFORM_OWNER" ? prole : null;

    return { userId: sub, platformRole };
  } catch {
    return null;
  }
}

/** Extracts a bearer token from an Authorization header. */
export function bearerFrom(header: string | undefined | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}
