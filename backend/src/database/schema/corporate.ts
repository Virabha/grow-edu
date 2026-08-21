import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { corporateContractStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export const corporateSubGroups = pgTable(
  "corporate_sub_groups",
  {
    organizationId: organizationId(),
    subGroupId: text("sub_group_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text("contract_id").notNull(),
    name: text("name").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    contractIdx: index("corporate_sub_groups_contract_idx").on(table.contractId),
  })
);

export const corporateSubGroupMembers = pgTable(
  "corporate_sub_group_members",
  {
    organizationId: organizationId(),
    subGroupMemberId: text("sub_group_member_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subGroupId: text("sub_group_id").notNull(),
    contractId: text("contract_id").notNull(),
    userId: text("user_id").notNull(),
    addedBy: text("added_by").notNull(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => ({
    subGroupIdx: index("corporate_sub_group_members_sub_group_idx").on(table.subGroupId),
    contractUserIdx: index("corporate_sub_group_members_contract_user_idx").on(table.contractId, table.userId),
    uniqueMember: unique("corporate_sub_group_members_unique").on(table.subGroupId, table.userId),
  })
);

export const corporateContracts = pgTable(
  "corporate_contracts",
  {
    organizationId: organizationId(),
    contractId: text("contract_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull(),
    title: text("title").notNull(),
    seatCount: integer("seat_count").notNull(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    status: corporateContractStatusEnum("status").notNull().default("DRAFT"),
    paymentId: text("payment_id"),
    notes: text("notes"),
    createdBy: text("created_by").notNull(),
    cancelledAt: timestamp("cancelled_at"),
    activatedAt: timestamp("activated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("corporate_contracts_company_idx").on(table.companyId),
    statusIdx: index("corporate_contracts_status_idx").on(table.status),
    endsAtIdx: index("corporate_contracts_ends_at_idx").on(table.endsAt),
    paymentIdx: index("corporate_contracts_payment_idx").on(table.paymentId),
  })
);

export const corporateContractBatches = pgTable(
  "corporate_contract_batches",
  {
    organizationId: organizationId(),
    contractBatchId: text("contract_batch_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text("contract_id").notNull(),
    batchId: text("batch_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    contractIdx: index("corporate_contract_batches_contract_idx").on(
      table.contractId
    ),
    batchIdx: index("corporate_contract_batches_batch_idx").on(table.batchId),
    uniqueContractBatch: unique(
      "corporate_contract_batches_contract_batch_unique"
    ).on(table.contractId, table.batchId),
  })
);

export const corporateJoinLinks = pgTable(
  "corporate_join_links",
  {
    organizationId: organizationId(),
    joinLinkId: text("join_link_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text("contract_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    generation: integer("generation").notNull().default(1),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedBy: text("revoked_by"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    contractIdx: index("corporate_join_links_contract_idx").on(table.contractId),
    tokenHashIdx: index("corporate_join_links_token_hash_idx").on(
      table.tokenHash
    ),
  })
);

export const corporateSeats = pgTable(
  "corporate_seats",
  {
    organizationId: organizationId(),
    seatId: text("seat_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text("contract_id").notNull(),
    userId: text("user_id").notNull(),
    joinLinkId: text("join_link_id"),
    claimedAt: timestamp("claimed_at").notNull().defaultNow(),
    releasedAt: timestamp("released_at"),
    releasedBy: text("released_by"),
    releaseReason: text("release_reason"),
  },
  (table) => ({
    contractIdx: index("corporate_seats_contract_idx").on(table.contractId),
    userIdx: index("corporate_seats_user_idx").on(table.userId),
    contractReleasedIdx: index("corporate_seats_contract_released_idx").on(
      table.contractId,
      table.releasedAt
    ),
  })
);
