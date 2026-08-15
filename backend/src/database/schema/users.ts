import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import {
  userRoleEnum,
  emailTokenTypeEnum,
  teacherApplicationStatusEnum,
} from "./enums";

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
    companyId: text("company_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
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
    profileId: text("profile_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().unique(),
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
  })
);

export const teacherApplications = pgTable(
  "teacher_applications",
  {
    applicationId: text("application_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    experienceYears: integer("experience_years"),
    skills: jsonb("skills").$type<string[]>(),
    categories: jsonb("categories").$type<string[]>(),
    cvUrl: text("cv_url"),
    whyJoin: text("why_join"),
    status: teacherApplicationStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("teacher_applications_status_idx").on(table.status),
    emailIdx: index("teacher_applications_email_idx").on(table.email),
    createdAtIdx: index("teacher_applications_created_at_idx").on(table.createdAt),
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
    credentialId: text("credential_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().unique(),
    zoomClientId: text("zoom_client_id"),
    zoomClientSecret: text("zoom_client_secret"),
    jitsiAppId: text("jitsi_app_id"),
    jitsiSecret: text("jitsi_secret"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("instructor_meeting_credentials_user_idx").on(table.userId),
  }),
);
