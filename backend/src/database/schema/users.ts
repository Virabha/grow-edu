import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  userRoleEnum,
  emailTokenTypeEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const users = pgTable(
  "users",
  {
    userId: text("user_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: userRoleEnum("role").notNull().default("LEARNER"),
    emailVerified: boolean("email_verified").notNull().default(false),
    profileImage: text("profile_image"),
    headline: text("headline"),
    bio: text("bio"),
    phone: text("phone"),
    addressLine: text("address_line"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    postalCode: text("postal_code"),
    social: jsonb("social").$type<Record<string, string>>().default({}),
    companyId: text("company_id"),
    suspendedAt: timestamp("suspended_at"),
    suspensionReason: text("suspension_reason"),
    suspendedBy: text("suspended_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    suspendedIdx: index("users_suspended_at_idx").on(table.suspendedAt),
  })
);

export const emailTokens = pgTable(
  "email_tokens",
  {
    tokenId: text("token_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    tokenType: emailTokenTypeEnum("token_type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("email_tokens_user_id_idx").on(table.userId),
    tokenHashIdx: index("email_tokens_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("email_tokens_expires_at_idx").on(table.expiresAt),
  })
);

export const instructorProfiles = pgTable(
  "instructor_profiles",
  {
    organizationId: organizationId(),
    profileId: text("profile_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    bio: text("bio"),
    expertise: jsonb("expertise").$type<string[]>(),
    experience: text("experience"),
    education: text("education"),
    avatarUrl: text("avatar_url"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("instructor_profiles_user_id_idx").on(table.userId),
    displayOrderIdx: index("instructor_profiles_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("instructor_profiles_is_active_idx").on(table.isActive),
    userPerOrg: unique("instructor_profiles_organization_user_unique").on(
      table.organizationId,
      table.userId
    ),
  })
);

/**
 * Live-meeting credentials, deliberately NOT columns on instructorProfiles.
 *
 * A separate table means the profile endpoints cannot leak a client secret by
 * selecting the whole row. Nothing here is ever returned to a client in full —
 * secrets are reported as configured/not-configured only.
 */
export const instructorMeetingCredentials = pgTable(
  "instructor_meeting_credentials",
  {
    organizationId: organizationId(),
    credentialId: text("credential_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    zoomClientId: text("zoom_client_id"),
    zoomClientSecret: text("zoom_client_secret"),
    jitsiAppId: text("jitsi_app_id"),
    jitsiSecret: text("jitsi_secret"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("instructor_meeting_credentials_user_idx").on(table.userId),
    userPerOrg: unique(
      "instructor_meeting_credentials_organization_user_unique"
    ).on(table.organizationId, table.userId),
  }),
);

export const userDevices = pgTable(
  "user_devices",
  {
    deviceId: text("device_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    label: text("label"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("user_devices_user_idx").on(table.userId),
    userLastSeenIdx: index("user_devices_user_last_seen_idx").on(
      table.userId,
      table.lastSeenAt,
    ),
  }),
);
