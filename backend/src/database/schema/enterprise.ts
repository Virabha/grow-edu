import { pgTable, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { ssoProviderTypeEnum } from "./enums";
import { organizationId } from "./organizations";

export const corporateSsoConfigs = pgTable(
  "corporate_sso_configs",
  {
    organizationId: organizationId(),
    ssoConfigId: text("sso_config_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull().unique(),
    providerType: ssoProviderTypeEnum("provider_type").notNull(),
    issuerUrl: text("issuer_url").notNull(),
    clientId: text("client_id").notNull(),
    clientSecret: text("client_secret").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    companyIdx: index("corporate_sso_configs_company_idx").on(table.companyId),
  })
);

export const corporateSsoLinks = pgTable(
  "corporate_sso_links",
  {
    organizationId: organizationId(),
    linkId: text("link_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull(),
    userId: text("user_id").notNull(),
    externalSubject: text("external_subject").notNull(),
    linkedAt: timestamp("linked_at").notNull(),
  },
  (table) => ({
    companySubjectUnique: unique(
      "corporate_sso_links_company_subject_unique"
    ).on(table.companyId, table.externalSubject),
    companyUserUnique: unique("corporate_sso_links_company_user_unique").on(
      table.companyId,
      table.userId
    ),
    companyIdx: index("corporate_sso_links_company_idx").on(table.companyId),
    userIdx: index("corporate_sso_links_user_idx").on(table.userId),
  })
);

export const corporateApiCredentials = pgTable(
  "corporate_api_credentials",
  {
    organizationId: organizationId(),
    credentialId: text("credential_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull(),
    label: text("label").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    issuedBy: text("issued_by").notNull(),
    issuedAt: timestamp("issued_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedBy: text("revoked_by"),
  },
  (table) => ({
    companyIdx: index("corporate_api_credentials_company_idx").on(
      table.companyId
    ),
    keyHashIdx: index("corporate_api_credentials_key_hash_idx").on(
      table.keyHash
    ),
  })
);

export const corporateBranding = pgTable(
  "corporate_branding",
  {
    organizationId: organizationId(),
    brandingId: text("branding_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull().unique(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    companyIdx: index("corporate_branding_company_idx").on(table.companyId),
  })
);
