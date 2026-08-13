/**
 * Tenancy — the multi-tenant core.
 *
 * Schema, organisation context, host resolution, the permission catalogue and
 * access tokens. Previously three workspace packages; inlined here because the
 * root pnpm workspace caused more problems than it solved (it broke Next.js
 * module resolution in the learner app and silently captured `pnpm install` in
 * every non-member directory).
 *
 * Everything a tenant-scoped query needs is exported from this file.
 */

// --- schema ---------------------------------------------------------------
export * as schema from "./schema";
export {
  organizations,
  users,
  organizationMembers,
  tenantColumn,
  ORG_CONTEXT_SETTING,
  currentOrgSql,
  orgStatusEnum,
  kycStatusEnum,
  videoQualityEnum,
  memberRoleEnum,
  memberStatusEnum,
  platformRoleEnum,
} from "./schema";

// --- organisation context -------------------------------------------------
export {
  withOrgContext,
  withPlatformContext,
  OrgContextError,
  APP_ROLE,
  type Db,
  type Tx,
} from "./tenant";

export { createDb, type DbConnection } from "./client";

// --- host resolution ------------------------------------------------------
export {
  resolveHost,
  isSlugAvailableForUse,
  normalizeSlug,
  RESERVED_SLUGS,
  type HostConfig,
  type HostResolution,
} from "./host";

// --- permissions ----------------------------------------------------------
export {
  ORG_PERMISSIONS,
  ALL_ORG_PERMISSIONS,
  OWN_ONLY_PERMISSIONS,
  BUILTIN_ROLE_PERMISSIONS,
  can,
  canAct,
  isOrgPermission,
  parsePermissions,
  type OrgActor,
  type OrgPermission,
  type PermissionBase,
  type PermissionGroup,
} from "./permissions";

// --- request context ------------------------------------------------------
export {
  resolveRequestContext,
  type RequestContext,
  type ContextLoaders,
  type MembershipRecord,
  type OrgRecord,
  type TokenClaims,
  type MemberRole,
  type PlatformRole,
  type AccessLevel,
} from "./context";

// --- tokens ---------------------------------------------------------------
export {
  issueAccessToken,
  verifyAccessToken,
  bearerFrom,
  secretFrom,
  type TokenConfig,
} from "./tokens";
