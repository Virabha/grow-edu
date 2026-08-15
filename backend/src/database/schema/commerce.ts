import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  itemTypeEnum,
  paymentGatewayEnum,
  refundStatusEnum,
  paymentStatusEnum,
  discountTypeEnum,
  couponUsageStatusEnum,
  payoutStatusEnum,
  currencyPositionEnum,
} from "./enums";

export const payments = pgTable(
  "payments",
  {
    paymentId: text("payment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    enrollmentId: text("enrollment_id").unique(),
    idempotencyKey: text("idempotency_key").unique(),
    courseId: text("course_id"),
    sectionId: text("section_id"),
    itemType: itemTypeEnum("item_type").notNull().default("COURSE"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    originalAmount: decimal("original_amount", { precision: 10, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
    couponId: text("coupon_id"),
    currency: text("currency").notNull(),
    gateway: paymentGatewayEnum("gateway").notNull(),
    gatewayId: text("gateway_id"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    paymentProofUrl: text("payment_proof_url"),
    transactionId: text("transaction_id"),
    payerName: text("payer_name"),
    invoiceNo: text("invoice_no").unique(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
    refundStatus: refundStatusEnum("refund_status").notNull().default("NONE"),
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
    courseIdx: index("payments_course_idx").on(table.courseId),
    sectionIdx: index("payments_section_idx").on(table.sectionId),
    couponIdx: index("payments_coupon_idx").on(table.couponId),
    txnIdx: index("payments_transaction_id_idx").on(table.transactionId),
    userStatusIdx: index("payments_user_status_idx").on(table.userId, table.status),
    userCreatedIdx: index("payments_user_created_idx").on(table.userId, table.createdAt),
    refundStatusIdx: index("payments_refund_status_idx").on(table.refundStatus),
  })
);

// =============================================
// COUPON SYSTEM TABLES
// =============================================

export const coupons = pgTable(
  "coupons",
  {
    couponId: text("coupon_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponCode: text("coupon_code").notNull(),
    discountType: discountTypeEnum("discount_type").notNull().default("PERCENTAGE"),
    discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
    maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
    minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }),
    validFrom: timestamp("valid_from").notNull().defaultNow(),
    validTill: timestamp("valid_till").notNull(),
    usageLimit: integer("usage_limit"),
    usageLimitPerUser: integer("usage_limit_per_user").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeActiveIdx: index("coupons_code_lookup_idx").on(
      table.couponCode,
      table.isActive,
      table.isDeleted
    ),
    isActiveIdx: index("coupons_is_active_idx").on(table.isActive),
    validTillIdx: index("coupons_valid_till_idx").on(table.validTill),
  })
);

// Coupon-Category junction table (many-to-many)
export const couponCategories = pgTable(
  "coupon_categories",
  {
    couponCategoryId: text("coupon_category_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text("coupon_id").notNull(),
    categoryId: text("category_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    couponCategoryUnique: unique("coupon_categories_unique").on(
      table.couponId,
      table.categoryId
    ),
    couponIdx: index("coupon_categories_coupon_idx").on(table.couponId),
    categoryIdx: index("coupon_categories_category_idx").on(table.categoryId),
  })
);

// Coupon-Course junction table (many-to-many)
export const couponCourses = pgTable(
  "coupon_courses",
  {
    couponCourseId: text("coupon_course_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text("coupon_id").notNull(),
    courseId: text("course_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    couponCourseUnique: unique("coupon_courses_unique").on(
      table.couponId,
      table.courseId
    ),
    couponIdx: index("coupon_courses_coupon_idx").on(table.couponId),
    courseIdx: index("coupon_courses_course_idx").on(table.courseId),
  })
);

// Coupon usage tracking table
export const couponUsages = pgTable(
  "coupon_usages",
  {
    usageId: text("usage_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text("coupon_id").notNull(),
    userId: text("user_id").notNull(),
    paymentId: text("payment_id"),
    courseId: text("course_id"),
    status: couponUsageStatusEnum("status").notNull().default("CONSUMED"),
    reservedExpiresAt: timestamp("reserved_expires_at"),
    consumedAt: timestamp("consumed_at"),
    cancelledAt: timestamp("cancelled_at"),
    discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
    originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
    finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    couponIdx: index("coupon_usages_coupon_idx").on(table.couponId),
    userIdx: index("coupon_usages_user_idx").on(table.userId),
    couponUserIdx: index("coupon_usages_coupon_user_idx").on(
      table.couponId,
      table.userId
    ),
    paymentIdx: index("coupon_usages_payment_idx").on(table.paymentId),
    couponStatusIdx: index("coupon_usages_coupon_status_idx").on(
      table.couponId,
      table.status,
      table.reservedExpiresAt
    ),
    couponUserStatusIdx: index("coupon_usages_coupon_user_status_idx").on(
      table.couponId,
      table.userId,
      table.status,
      table.reservedExpiresAt
    ),
  })
);

/* ==========================================================================
 * Instructor portal — payouts, course announcements, live-meeting credentials.
 *
 * Modelled from the SkillGro instructor screens (docs sections in_request,
 * in_announcement, zoom_setting, jitsi_setting). Money stays `decimal(10,2)`
 * to match `payments.amount`, which these figures derive from — mixing minor
 * units into a decimal money domain is a worse bug than the existing defect.
 * Converting the whole money domain is tracked as A8.
 * ======================================================================== */

export const payoutRequests = pgTable(
  "payout_requests",
  {
    payoutId: text("payout_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    instructorId: text("instructor_id").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("INR"),
    /** Free text for now: admin-managed withdraw methods are a separate slice. */
    method: text("method").notNull(),
    accountDetails: text("account_details"),
    status: payoutStatusEnum("status").notNull().default("PENDING"),
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    processedBy: text("processed_by"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    instructorIdx: index("payout_requests_instructor_idx").on(table.instructorId),
    statusIdx: index("payout_requests_status_idx").on(table.status),
    statusRequestedIdx: index("payout_requests_status_requested_idx").on(
      table.status,
      table.requestedAt,
    ),
  }),
);

export const withdrawMethods = pgTable(
  "withdraw_methods",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    minAmount: decimal("min_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    maxAmount: decimal("max_amount", { precision: 10, scale: 2 }),
    processingDays: integer("processing_days"),
    feePercent: decimal("fee_percent", { precision: 5, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index("withdraw_methods_is_active_idx").on(table.isActive),
  }),
);

export const currencies = pgTable(
  "currencies",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    symbol: text("symbol").notNull(),
    /** Exchange rate against INR, the base currency [D-023]. */
    rate: decimal("rate", { precision: 18, scale: 6 }).notNull().default("1"),
    position: currencyPositionEnum("position").notNull().default("before"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("currencies_code_idx").on(table.code),
  }),
);
