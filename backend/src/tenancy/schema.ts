/**
 * Tenancy core.
 *
 * Three tables define the whole multi-tenant model:
 *   organizations        the tenant [D-001]
 *   users                global identity, no organisation, NO ROLE [D-035d]
 *   organization_members what a person may do, and where [D-035a]-[D-035e]
 *
 * Row-Level Security policies and the partial unique index that enforces
 * "one instructor membership per user" live in migrations/0001_tenancy.sql —
 * they cannot be expressed in Drizzle 0.29 and are not optional extras.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

/** [D-017] KYC and payment precede access, so a new org starts PENDING_KYC.
 *  [D-018] SUSPENDED is read-only, not dark. [D-019] deletion has a grace period. */
export const orgStatusEnum = pgEnum("org_status", [
  "PENDING_KYC",
  "ACTIVE",
  "GRACE",
  "SUSPENDED",
  "PENDING_DELETION",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "NOT_STARTED",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
]);

/** [D-027] quality is a plan feature and feeds directly into metered cost. */
export const videoQualityEnum = pgEnum("video_quality", [
  "STANDARD",
  "HIGH",
  "ULTRA",
]);

/** Organisation-level role. Lives on the membership, never on the user. */
export const memberRoleEnum = pgEnum("member_role", [
  "OWNER",
  "ADMIN",
  "INSTRUCTOR",
  "STUDENT",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
]);

/** Platform-level role. Null for everyone except staff. [D-013] */
export const platformRoleEnum = pgEnum("platform_role", [
  "PLATFORM_SUPPORT",
  "PLATFORM_OWNER",
]);

/* ---------------------------------------------------------- organizations */

export const organizations = pgTable(
  "organizations",
  {
    organizationId: uuid("organization_id").primaryKey().defaultRandom(),

    name: text("name").notNull(),

    /** Subdomain label. THE tenant key — resolved from the host on every
     *  request [D-045]. Must be validated against a reserved-name list
     *  (www, api, admin, app, mail, static, cdn…) before insert. */
    slug: text("slug").notNull(),

    status: orgStatusEnum("status").notNull().default("PENDING_KYC"),

    /* branding [D-003] */
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),

    /* onboarding [D-014] [D-017] */
    kycStatus: kycStatusEnum("kyc_status").notNull().default("NOT_STARTED"),
    kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),

    /* commerce [D-006] [D-020] [D-022] */
    payoutAccountRef: text("payout_account_ref"),
    commissionRateBps: integer("commission_rate_bps").notNull().default(1000),
    instructorRevenueShare: boolean("instructor_revenue_share")
      .notNull()
      .default(false),

    /* metering and plan [D-007] [D-024] [D-025] [D-027] */
    videoQuality: videoQualityEnum("video_quality").notNull().default("STANDARD"),
    storageQuotaBytes: bigint("storage_quota_bytes", { mode: "bigint" }),
    bandwidthQuotaBytes: bigint("bandwidth_quota_bytes", { mode: "bigint" }),
    graceStartedAt: timestamp("grace_started_at", { withTimezone: true }),

    /* billing [D-026] */
    billingCustomerRef: text("billing_customer_ref"),

    /* lifecycle [D-018] [D-019] */
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    deletionScheduledAt: timestamp("deletion_scheduled_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("organizations_slug_key").on(t.slug),
    statusIdx: index("organizations_status_idx").on(t.status),
  }),
);

/* ----------------------------------------------------------------- users */

export const users = pgTable(
  "users",
  {
    userId: uuid("user_id").primaryKey().defaultRandom(),

    /** Stored lower-cased; uniqueness is enforced on the lower-cased value in
     *  the migration so Foo@x.com and foo@x.com cannot both exist. */
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),

    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),

    /** Platform staff only. Organisation authority NEVER comes from here —
     *  it is resolved per request from organization_members [D-035d]. */
    platformRole: platformRoleEnum("platform_role"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    platformRoleIdx: index("users_platform_role_idx").on(t.platformRole),
  }),
);

/* --------------------------------------------------- organization_members */

export const organizationMembers = pgTable(
  "organization_members",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),

    role: memberRoleEnum("role").notNull(),
    status: memberStatusEnum("status").notNull().default("INVITED"),

    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    /** One row per (user, org, role) — so a person may hold more than one role
     *  in an organisation. [D-052] does not need this, but nothing forbids it. */
    pk: primaryKey({
      columns: [t.userId, t.organizationId, t.role],
      name: "organization_members_pkey",
    }),
    /** Listing an organisation's members is the common query. */
    orgRoleIdx: index("organization_members_org_role_idx").on(
      t.organizationId,
      t.role,
    ),
    /** Resolving "which organisations is this user in" on login. */
    userIdx: index("organization_members_user_idx").on(t.userId),
  }),
);

/* --------------------------------------------------------------- helpers */

/** Every tenant-owned table carries this. Spread it into the column object so
 *  the column name and FK behaviour cannot drift between tables. */
export const tenantColumn = {
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.organizationId, { onDelete: "cascade" }),
};

/** The Postgres setting RLS reads, and that `withOrgContext` sets. */
export const ORG_CONTEXT_SETTING = "app.current_org";

export const currentOrgSql = sql`current_setting(${sql.raw(
  `'${ORG_CONTEXT_SETTING}'`,
)}, true)::uuid`;
