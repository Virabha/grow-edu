/**
 * Request context resolution.
 *
 * Turns (Host header, bearer token) into "who is this, in which organisation,
 * and what may they do". This is the replacement for groEdu's global
 * `users.role` column, which [D-035d] removes because a person who instructs in
 * organisation B must carry no authority whatsoever into organisation A.
 *
 * The governing rule: **a token alone never grants access to an organisation.**
 * The host says which organisation; the membership says whether this user
 * belongs to it. Both must agree, every request.
 */
import { resolveHost, type HostConfig } from "./host";
import {
  BUILTIN_ROLE_PERMISSIONS,
  type OrgActor,
  type OrgPermission,
} from "./permissions";

export type MemberRole = "OWNER" | "ADMIN" | "INSTRUCTOR" | "STUDENT";
export type PlatformRole = "PLATFORM_SUPPORT" | "PLATFORM_OWNER";

export interface OrgRecord {
  organizationId: string;
  slug: string;
  status:
    | "PENDING_KYC"
    | "ACTIVE"
    | "GRACE"
    | "SUSPENDED"
    | "PENDING_DELETION";
}

export interface MembershipRecord {
  role: MemberRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  /** Set when the organisation defines a custom role [D-039]. */
  customPermissions?: readonly OrgPermission[];
}

export interface TokenClaims {
  userId: string;
  platformRole?: PlatformRole | null;
}

export interface ContextLoaders {
  findOrganizationBySlug(slug: string): Promise<OrgRecord | null>;
  findMembership(
    userId: string,
    organizationId: string,
  ): Promise<MembershipRecord | null>;
}

/** What the organisation's lifecycle state permits right now. */
export type AccessLevel = "full" | "read-only" | "blocked";

export type RequestContext =
  | {
      kind: "organization";
      organization: OrgRecord;
      actor: OrgActor;
      role: MemberRole;
      access: AccessLevel;
    }
  | { kind: "platform"; userId: string; platformRole: PlatformRole }
  | { kind: "public" }
  | { kind: "unauthenticated" }
  /** Also returned when the caller has no membership — see note below. */
  | { kind: "not-found" };

/**
 * [D-018] A suspended organisation is read-only: staff cannot publish or sell,
 * but enrolled students keep access to what they paid for.
 * [D-017] A PENDING_KYC organisation cannot operate at all yet.
 */
function accessFor(status: OrgRecord["status"]): AccessLevel {
  switch (status) {
    case "ACTIVE":
    case "GRACE":
      return "full";
    case "SUSPENDED":
      return "read-only";
    case "PENDING_KYC":
    case "PENDING_DELETION":
      return "blocked";
  }
}

function permissionsFor(m: MembershipRecord): ReadonlySet<OrgPermission> {
  return new Set(m.customPermissions ?? BUILTIN_ROLE_PERMISSIONS[m.role]);
}

export async function resolveRequestContext(
  input: { host: string | undefined | null; claims: TokenClaims | null },
  config: HostConfig,
  loaders: ContextLoaders,
): Promise<RequestContext> {
  const resolved = resolveHost(input.host, config);

  if (resolved.kind === "unknown") return { kind: "not-found" };
  if (resolved.kind === "public") return { kind: "public" };

  if (resolved.kind === "platform") {
    if (!input.claims) return { kind: "unauthenticated" };
    const role = input.claims.platformRole;
    // Platform staff only. A normal user reaching the console gets 404, not
    // 403 — its existence is not something to confirm to arbitrary callers.
    if (!role) return { kind: "not-found" };
    return { kind: "platform", userId: input.claims.userId, platformRole: role };
  }

  const organization = await loaders.findOrganizationBySlug(resolved.slug);
  if (!organization) return { kind: "not-found" };

  if (!input.claims) return { kind: "unauthenticated" };

  const membership = await loaders.findMembership(
    input.claims.userId,
    organization.organizationId,
  );

  // [D-046] No membership resolves to not-found, never forbidden. A 403 would
  // confirm that this organisation exists to someone with no relationship to
  // it, which is exactly the cross-tenant leak the whole model prevents.
  // An INVITED or SUSPENDED membership is treated the same way: not yet, or no
  // longer, a member.
  if (!membership || membership.status !== "ACTIVE") {
    return { kind: "not-found" };
  }

  return {
    kind: "organization",
    organization,
    role: membership.role,
    access: accessFor(organization.status),
    actor: {
      userId: input.claims.userId,
      organizationId: organization.organizationId,
      permissions: permissionsFor(membership),
    },
  };
}
