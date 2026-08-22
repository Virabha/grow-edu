import {
  pgTable,
  text,
  timestamp,
  decimal,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  itemTypeEnum,
  paymentGatewayEnum,
  refundStatusEnum,
  paymentStatusEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const payments = pgTable(
  "payments",
  {
    organizationId: organizationId(),
    paymentId: text("payment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    idempotencyKey: text("idempotency_key"),
    batchId: text("batch_id"),
    corporateContractId: text("corporate_contract_id"),
    itemType: itemTypeEnum("item_type").notNull().default("BATCH"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    originalAmount: decimal("original_amount", { precision: 10, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
    currency: text("currency").notNull(),
    gateway: paymentGatewayEnum("gateway").notNull(),
    gatewayId: text("gateway_id"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    paymentProofUrl: text("payment_proof_url"),
    transactionId: text("transaction_id"),
    payerName: text("payer_name"),
    invoiceNo: text("invoice_no"),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
    refundStatus: refundStatusEnum("refund_status").notNull().default("NONE"),
    refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    refundReason: text("refund_reason"),
    refundRequestedAt: timestamp("refund_requested_at"),
    refundResolvedAt: timestamp("refund_resolved_at"),
    refundResolvedBy: text("refund_resolved_by"),
    proofUploadedAt: timestamp("proof_uploaded_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: text("reviewed_by"),
    reviewNotes: text("review_notes"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("payments_user_idx").on(table.userId),
    gatewayIdx: index("payments_gateway_idx").on(table.gatewayId),
    statusIdx: index("payments_status_idx").on(table.status),
    batchIdx: index("payments_batch_idx").on(table.batchId),
    corporateContractIdx: index("payments_corporate_contract_idx").on(
      table.corporateContractId
    ),
    txnIdx: index("payments_transaction_id_idx").on(table.transactionId),
    userStatusIdx: index("payments_user_status_idx").on(table.userId, table.status),
    userCreatedIdx: index("payments_user_created_idx").on(table.userId, table.createdAt),
    refundStatusIdx: index("payments_refund_status_idx").on(table.refundStatus),
    invoicePerOrg: unique("payments_organization_invoice_unique").on(
      table.organizationId,
      table.invoiceNo
    ),
    idempotencyPerOrg: unique("payments_organization_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey
    ),
  })
);
