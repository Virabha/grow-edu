import {
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { invoiceKindEnum } from "./enums";
import { organizationId } from "./organizations";

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

export const invoiceSequences = pgTable(
  "invoice_sequences",
  {
    organizationId: organizationId(),
    series: text("series").notNull(),
    nextValue: integer("next_value").notNull().default(1),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    seriesPerOrg: unique("invoice_sequences_organization_series_unique").on(
      table.organizationId,
      table.series,
    ),
  }),
);

export const invoices = pgTable(
  "invoices",
  {
    organizationId: organizationId(),
    invoiceId: text("invoice_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: invoiceKindEnum("kind").notNull().default("INVOICE"),
    series: text("series").notNull(),
    sequence: integer("sequence").notNull(),
    invoiceNo: text("invoice_no").notNull(),
    paymentId: text("payment_id"),
    contractId: text("contract_id"),
    correctsInvoiceId: text("corrects_invoice_id"),
    buyerUserId: text("buyer_user_id").notNull(),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    currency: text("currency").notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    tax: decimal("tax", { precision: 12, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    lines: jsonb("lines").$type<InvoiceLine[]>().notNull(),
    reason: text("reason"),
    issuedAt: timestamp("issued_at").notNull(),
    issuedBy: text("issued_by"),
  },
  (table) => ({
    numberPerOrg: unique("invoices_organization_number_unique").on(
      table.organizationId,
      table.invoiceNo,
    ),
    sequencePerSeries: unique("invoices_organization_series_sequence_unique").on(
      table.organizationId,
      table.series,
      table.sequence,
    ),
    paymentPerOrg: unique("invoices_organization_payment_unique").on(
      table.organizationId,
      table.paymentId,
    ),
    buyerIdx: index("invoices_buyer_idx").on(table.buyerUserId, table.issuedAt),
    contractIdx: index("invoices_contract_idx").on(table.contractId),
    correctsIdx: index("invoices_corrects_idx").on(table.correctsInvoiceId),
    issuedAtIdx: index("invoices_issued_at_idx").on(table.issuedAt),
  }),
);
