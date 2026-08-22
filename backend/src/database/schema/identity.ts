import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { identityProviderEnum, parentLinkStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export const userIdentities = pgTable(
  "user_identities",
  {
    organizationId: organizationId(),
    identityId: text("identity_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    provider: identityProviderEnum("provider").notNull(),
    subject: text("subject").notNull(),
    verifiedAt: timestamp("verified_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    oneClaimPerSubject: unique("user_identities_provider_subject_unique").on(
      table.provider,
      table.subject,
    ),
    oneMethodPerUser: unique("user_identities_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    userIdx: index("user_identities_user_idx").on(table.userId),
  }),
);

export const phoneSignInCodes = pgTable(
  "phone_sign_in_codes",
  {
    organizationId: organizationId(),
    codeId: text("code_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    attemptCount: integer("attempt_count").notNull().default(0),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    phoneIdx: index("phone_sign_in_codes_phone_idx").on(
      table.phone,
      table.createdAt,
    ),
    liveIdx: index("phone_sign_in_codes_live_idx").on(
      table.phone,
      table.consumedAt,
      table.expiresAt,
    ),
  }),
);

export const parentLinks = pgTable(
  "parent_links",
  {
    organizationId: organizationId(),
    linkId: text("link_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    parentUserId: text("parent_user_id").notNull(),
    studentUserId: text("student_user_id").notNull(),
    status: parentLinkStatusEnum("status").notNull().default("PENDING"),
    consentTokenHash: text("consent_token_hash"),
    consentExpiresAt: timestamp("consent_expires_at"),
    requestedAt: timestamp("requested_at").notNull(),
    consentedAt: timestamp("consented_at"),
    revokedAt: timestamp("revoked_at"),
    revokedBy: text("revoked_by"),
  },
  (table) => ({
    onePerPair: unique("parent_links_parent_student_unique").on(
      table.parentUserId,
      table.studentUserId,
    ),
    parentIdx: index("parent_links_parent_idx").on(
      table.parentUserId,
      table.status,
    ),
    studentIdx: index("parent_links_student_idx").on(
      table.studentUserId,
      table.status,
    ),
  }),
);
