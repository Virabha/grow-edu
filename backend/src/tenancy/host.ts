/**
 * Resolves which organisation a request is for, from the Host header.
 *
 * This is the origin of tenant context [D-045], which makes it security
 * critical: the Host header is attacker-controlled, so resolution is strict
 * allow-listing, never pattern-matching. In particular
 * `acme.groedu.com.evil.com` must not resolve to `acme`.
 */

/** Names that can never be an organisation slug. Mirrors the CHECK constraint
 *  in migrations/manual/0001_tenancy_rls.sql — keep the two in step. */
export const RESERVED_SLUGS = new Set([
  "www", "api", "app", "admin", "platform", "static", "cdn", "assets", "mail",
  "smtp", "ftp", "ns1", "ns2", "status", "docs", "help", "support", "billing",
  "account", "accounts", "auth", "login", "signup", "test", "staging", "dev",
]);

/** 3–63 characters, DNS-label safe, no leading or trailing hyphen.
 *  Minimum of three is a product choice, not a DNS one: one- and two-character
 *  subdomains are scarce, easily confused, and the first thing squatted.
 *  MUST stay identical to organizations_slug_format in
 *  migrations/manual/0001_tenancy_rls.sql. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export interface HostConfig {
  /** e.g. "groedu.com". No leading dot. */
  rootDomain: string;
  /** Subdomain that serves the platform-owner console. Default "admin". */
  platformSubdomain?: string;
}

export type HostResolution =
  /** `<slug>.rootDomain` — a tenant. */
  | { kind: "organization"; slug: string }
  /** The platform-owner console [D-013]. */
  | { kind: "platform" }
  /** Apex or www — marketing site, no tenant. */
  | { kind: "public" }
  /** Anything not under the configured root domain. Never guess. */
  | { kind: "unknown" };

/**
 * @param host raw Host header, may include a port and mixed case.
 */
export function resolveHost(
  host: string | undefined | null,
  config: HostConfig,
): HostResolution {
  if (!host) return { kind: "unknown" };

  // Strip port, lower-case, drop a trailing dot (FQDN form is legal in Host).
  const hostname = host
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

  if (!hostname) return { kind: "unknown" };

  const root = config.rootDomain.trim().toLowerCase().replace(/^\./, "");
  const platform = (config.platformSubdomain ?? "admin").toLowerCase();

  if (hostname === root) return { kind: "public" };

  // Strict suffix match. Checking `endsWith(root)` alone would accept
  // "notgroedu.com"; requiring the dot and then re-checking the remainder
  // has no dots is what rejects "acme.groedu.com.evil.com".
  const suffix = `.${root}`;
  if (!hostname.endsWith(suffix)) return { kind: "unknown" };

  const label = hostname.slice(0, -suffix.length);

  // Exactly one label. "a.b.groedu.com" is not an organisation.
  if (!label || label.includes(".")) return { kind: "unknown" };

  if (label === platform) return { kind: "platform" };
  if (label === "www") return { kind: "public" };
  if (RESERVED_SLUGS.has(label)) return { kind: "unknown" };
  if (!SLUG_RE.test(label)) return { kind: "unknown" };

  return { kind: "organization", slug: label };
}

/**
 * Canonical form of a slug: trimmed and lower-cased.
 *
 * Storage MUST use this. The `organizations_slug_format` CHECK constraint
 * accepts lower-case only, and `resolveHost` lower-cases the incoming host, so
 * an organisation stored as "Acme" would never be reachable.
 */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/**
 * Whether the CANONICAL form of `slug` may be handed to a new organisation
 * at signup [D-016].
 *
 * Note this normalises before checking, so `isSlugAvailableForUse("Acme")` is
 * `true` — "acme" is a perfectly good slug. Callers must persist
 * `normalizeSlug(input)`, not the raw input. This is deliberately permissive at
 * the edge and strict at the point of storage.
 */
export function isSlugAvailableForUse(slug: string): boolean {
  const s = normalizeSlug(slug);
  return SLUG_RE.test(s) && !RESERVED_SLUGS.has(s);
}
