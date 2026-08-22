import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { ListOrdersDto } from './dto/list-orders.dto';
import { AdminListOrdersDto } from './dto/admin-list-orders.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { ResolveRefundDto } from './dto/resolve-refund.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { CLOCK, Clock } from '../common/clock';
import { InvoicesService } from '../invoices/invoices.service';
import { Transaction } from '../database/transaction';

export type RefundStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'DECLINED';

const EXCLUDE_CORPORATE_INVOICES = ne(
  schema.payments.itemType,
  'CORPORATE_CONTRACT',
);

export interface OrderItem {
  itemId: string;
  batchId: string;
  title: string;
  thumbnail: string;
  itemType: 'BATCH';
  unitPrice: number;
}

export interface OrderDto {
  orderId: string;
  invoiceNo: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  gateway: string;
  status: string;
  refundStatus: RefundStatus;
  refundedAmount: number;
  refundReason: string | null;
  transactionId: string | null;
  placedAt: string;
  billingName: string;
  billingEmail: string;
  paymentProofUrl: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewNotes: string | null;
  refundResolvedBy: string | null;
  refundResolvedByName: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const REFUND_EPSILON = 1e-9;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const VALID_STATUSES = [
  'PENDING',
  'PROOF_UPLOADED',
  'COMPLETED',
  'FAILED',
  'REJECTED',
  'REFUNDED',
] as const;

type PaymentStatus = (typeof VALID_STATUSES)[number];

function isPaymentStatus(v: string): v is PaymentStatus {
  return (VALID_STATUSES as readonly string[]).includes(v);
}

function stableInvoiceNo(paymentId: string): string {
  return `INV-${paymentId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function resolvedInvoiceNo(invoiceNo: string | null | undefined, paymentId: string): string {
  return invoiceNo ?? stableInvoiceNo(paymentId);
}

function buildDisplayName(
  firstName: string | null,
  lastName: string | null,
  fallback: string,
): string {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return name.length > 0 ? name : fallback;
}

type PaymentCore = {
  paymentId: string;
  invoiceNo: string | null | undefined;
  batchId: string | null;
  itemType: 'BATCH' | 'CORPORATE_CONTRACT';
  amount: string;
  originalAmount: string | null;
  discountAmount: string | null;
  taxAmount: string | null;
  currency: string;
  gateway: 'RAZORPAY' | 'MANUAL_QR' | 'PHONEPE' | 'FREE';
  status: 'PENDING' | 'PROOF_UPLOADED' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'REFUNDED';
  refundStatus: 'NONE' | 'REQUESTED' | 'APPROVED' | 'DECLINED';
  refundedAmount: string | null | undefined;
  refundReason: string | null;
  transactionId: string | null;
  payerName: string | null;
  paymentProofUrl: string | null;
  reviewedBy: string | null | undefined;
  reviewNotes: string | null | undefined;
  refundResolvedBy: string | null | undefined;
  createdAt: Date;
  metadata: unknown;
};

type ItemRow = Pick<
  PaymentCore,
  'paymentId' | 'batchId' | 'itemType' | 'amount' | 'metadata'
>;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly auditLog: AuditLogService,
    private readonly invoices: InvoicesService,
  ) {}

  private async resolveItemMap(rows: readonly ItemRow[]): Promise<Map<string, OrderItem>> {
    const batchIds = [
      ...new Set(
        rows
          .filter((r) => r.batchId !== null)
          .map((r) => r.batchId as string),
      ),
    ];

    const batchRows =
      batchIds.length > 0
        ? await this.db
            .select({
              batchId: schema.batches.batchId,
              title: schema.batches.title,
              thumbnail: schema.batches.thumbnail,
            })
            .from(schema.batches)
            .where(inArray(schema.batches.batchId, batchIds))
        : [];

    const byBatchId = new Map(batchRows.map((r) => [r.batchId, r]));

    const itemMap = new Map<string, OrderItem>();
    for (const row of rows) {
      const unitPrice = parseFloat(row.amount);
      const batchId = row.batchId ?? row.paymentId;
      const batch = row.batchId ? byBatchId.get(row.batchId) : undefined;
      const snapshotTitle =
        typeof row.metadata === 'object' &&
        row.metadata !== null &&
        typeof (row.metadata as { batchTitle?: unknown }).batchTitle === 'string'
          ? (row.metadata as { batchTitle: string }).batchTitle
          : null;

      itemMap.set(row.paymentId, {
        itemId: batchId,
        batchId,
        title: batch?.title ?? snapshotTitle ?? 'Unknown batch',
        thumbnail: batch?.thumbnail ?? '',
        itemType: 'BATCH',
        unitPrice,
      });
    }

    return itemMap;
  }

  private async resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const unique = [...new Set(userIds)];
    const rows = await this.db
      .select({
        userId: schema.users.userId,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(inArray(schema.users.userId, unique));
    return new Map(
      rows.map((r) => [r.userId, buildDisplayName(r.firstName, r.lastName, r.email)]),
    );
  }

  private collectAdminIds(rows: readonly PaymentCore[]): string[] {
    const ids: string[] = [];
    for (const r of rows) {
      if (r.reviewedBy) ids.push(r.reviewedBy);
      if (r.refundResolvedBy) ids.push(r.refundResolvedBy);
    }
    return ids;
  }

  private toOrderDto(
    p: PaymentCore,
    item: OrderItem | undefined,
    userEmail: string,
    userName: string,
    adminNameMap: Map<string, string>,
  ): OrderDto {
    const reviewedBy = p.reviewedBy ?? null;
    const refundResolvedBy = p.refundResolvedBy ?? null;
    return {
      orderId: p.paymentId,
      invoiceNo: resolvedInvoiceNo(p.invoiceNo, p.paymentId),
      items: item ? [item] : [],
      subtotal: parseFloat(p.originalAmount ?? p.amount),
      discount: parseFloat(p.discountAmount ?? '0'),
      tax: parseFloat(p.taxAmount ?? '0'),
      total: parseFloat(p.amount),
      currency: p.currency,
      gateway: p.gateway,
      status: p.status,
      refundStatus: p.refundStatus,
      refundedAmount: parseFloat(p.refundedAmount ?? '0'),
      refundReason: p.refundReason,
      transactionId: p.transactionId,
      placedAt: p.createdAt.toISOString(),
      billingName: p.payerName ?? userName,
      billingEmail: userEmail,
      paymentProofUrl: p.paymentProofUrl,
      reviewedBy,
      reviewedByName: reviewedBy ? (adminNameMap.get(reviewedBy) ?? null) : null,
      reviewNotes: p.reviewNotes ?? null,
      refundResolvedBy,
      refundResolvedByName: refundResolvedBy
        ? (adminNameMap.get(refundResolvedBy) ?? null)
        : null,
    };
  }

  async listOrders(
    userId: string,
    dto: ListOrdersDto,
  ): Promise<{ data: OrderDto[]; pagination: PaginationMeta }> {
    const page = dto.page ?? DEFAULT_PAGE;
    const limit = dto.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const statusFilter =
      dto.status && dto.status !== 'all' && isPaymentStatus(dto.status)
        ? eq(schema.payments.status, dto.status)
        : undefined;

    const term = dto.search?.trim();
    const searchFilter = term
      ? or(
          ilike(schema.payments.paymentId, `%${term}%`),
          ilike(schema.payments.invoiceNo, `%${term}%`),
          ilike(schema.batches.title, `%${term}%`),
          sql`${schema.payments.metadata}->>'batchTitle' ilike ${'%' + term + '%'}`,
        )
      : undefined;

    const where = and(
      eq(schema.payments.userId, userId),
      EXCLUDE_CORPORATE_INVOICES,
      statusFilter,
      searchFilter,
    );

    const [paymentRows, countRows, userRows] = await Promise.all([
      this.db
        .select({
          paymentId: schema.payments.paymentId,
          invoiceNo: schema.payments.invoiceNo,
          batchId: schema.payments.batchId,
          itemType: schema.payments.itemType,
          amount: schema.payments.amount,
          originalAmount: schema.payments.originalAmount,
          discountAmount: schema.payments.discountAmount,
          taxAmount: schema.payments.taxAmount,
          currency: schema.payments.currency,
          gateway: schema.payments.gateway,
          status: schema.payments.status,
          refundStatus: schema.payments.refundStatus,
          refundedAmount: schema.payments.refundedAmount,
          refundReason: schema.payments.refundReason,
          transactionId: schema.payments.transactionId,
          payerName: schema.payments.payerName,
          paymentProofUrl: schema.payments.paymentProofUrl,
          reviewedBy: schema.payments.reviewedBy,
          reviewNotes: schema.payments.reviewNotes,
          refundResolvedBy: schema.payments.refundResolvedBy,
          createdAt: schema.payments.createdAt,
          metadata: schema.payments.metadata,
        })
        .from(schema.payments)
        .leftJoin(schema.batches, eq(schema.payments.batchId, schema.batches.batchId))
        .where(where)
        .orderBy(desc(schema.payments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.payments)
        .leftJoin(schema.batches, eq(schema.payments.batchId, schema.batches.batchId))
        .where(where),
      this.db
        .select({
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
        })
        .from(schema.users)
        .where(eq(schema.users.userId, userId)),
    ]);

    const totalCount = countRows[0]?.total ?? 0;
    const userRow = userRows[0];
    const userEmail = userRow?.email ?? '';
    const userName = buildDisplayName(
      userRow?.firstName ?? null,
      userRow?.lastName ?? null,
      userEmail,
    );

    const [itemMap, adminNameMap] = await Promise.all([
      this.resolveItemMap(paymentRows),
      this.resolveUserNames(this.collectAdminIds(paymentRows)),
    ]);

    const data = paymentRows.map((p) =>
      this.toOrderDto(
        p,
        itemMap.get(p.paymentId),
        userEmail,
        userName,
        adminNameMap,
      ),
    );

    return {
      data,
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async getOrder(orderId: string, userId: string): Promise<OrderDto> {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.paymentId, orderId));

    if (!payment) throw new NotFoundException('Order not found.');
    if (payment.userId !== userId) throw new NotFoundException('Order not found.');

    const [userRow] = await this.db
      .select({
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.users)
      .where(eq(schema.users.userId, userId));

    const userEmail = userRow?.email ?? '';
    const userName = buildDisplayName(
      userRow?.firstName ?? null,
      userRow?.lastName ?? null,
      userEmail,
    );

    const [itemMap, adminNameMap] = await Promise.all([
      this.resolveItemMap([payment]),
      this.resolveUserNames(this.collectAdminIds([payment])),
    ]);

    return this.toOrderDto(
      payment,
      itemMap.get(payment.paymentId),
      userEmail,
      userName,
      adminNameMap,
    );
  }

  async requestRefund(orderId: string, userId: string, dto: RequestRefundDto): Promise<OrderDto> {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.paymentId, orderId));

    if (!payment) throw new NotFoundException('Order not found.');
    if (payment.userId !== userId) throw new NotFoundException('Order not found.');

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed orders can be refunded.');
    }

    if (payment.refundStatus === 'REQUESTED') {
      throw new ConflictException(
        'A refund request is already requested for this order.',
      );
    }

    const unrefunded =
      parseFloat(payment.amount) - parseFloat(payment.refundedAmount ?? '0');
    if (payment.refundStatus === 'APPROVED' && unrefunded <= REFUND_EPSILON) {
      throw new ConflictException(
        'This order has already been refunded in full.',
      );
    }

    const [updated] = await this.db
      .update(schema.payments)
      .set({
        refundStatus: 'REQUESTED',
        refundReason: dto.reason,
        refundRequestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.payments.paymentId, orderId))
      .returning();

    const [userRow] = await this.db
      .select({
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.users)
      .where(eq(schema.users.userId, userId));

    const userEmail = userRow?.email ?? '';
    const userName = buildDisplayName(
      userRow?.firstName ?? null,
      userRow?.lastName ?? null,
      userEmail,
    );

    const itemMap = await this.resolveItemMap([updated]);

    return this.toOrderDto(
      updated,
      itemMap.get(updated.paymentId),
      userEmail,
      userName,
      new Map(),
    );
  }

  async adminListOrders(
    dto: AdminListOrdersDto,
  ): Promise<{ data: OrderDto[]; pagination: PaginationMeta }> {
    const page = dto.page ?? DEFAULT_PAGE;
    const limit = dto.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const statusFilter =
      dto.status && dto.status !== 'all' && isPaymentStatus(dto.status)
        ? eq(schema.payments.status, dto.status)
        : undefined;

    const term = dto.search?.trim();
    const searchFilter = term
      ? or(
          ilike(schema.users.email, `%${term}%`),
          sql`lower(coalesce(${schema.users.firstName}, '')) like lower(${'%' + term + '%'})`,
          sql`lower(coalesce(${schema.users.lastName}, '')) like lower(${'%' + term + '%'})`,
        )
      : undefined;

    const where = and(EXCLUDE_CORPORATE_INVOICES, statusFilter, searchFilter);

    const [paymentRows, countRows] = await Promise.all([
      this.db
        .select({
          paymentId: schema.payments.paymentId,
          invoiceNo: schema.payments.invoiceNo,
          batchId: schema.payments.batchId,
          itemType: schema.payments.itemType,
          amount: schema.payments.amount,
          originalAmount: schema.payments.originalAmount,
          discountAmount: schema.payments.discountAmount,
          taxAmount: schema.payments.taxAmount,
          currency: schema.payments.currency,
          gateway: schema.payments.gateway,
          status: schema.payments.status,
          refundStatus: schema.payments.refundStatus,
          refundedAmount: schema.payments.refundedAmount,
          refundReason: schema.payments.refundReason,
          transactionId: schema.payments.transactionId,
          payerName: schema.payments.payerName,
          paymentProofUrl: schema.payments.paymentProofUrl,
          reviewedBy: schema.payments.reviewedBy,
          reviewNotes: schema.payments.reviewNotes,
          refundResolvedBy: schema.payments.refundResolvedBy,
          createdAt: schema.payments.createdAt,
          metadata: schema.payments.metadata,
          userEmail: schema.users.email,
          userFirstName: schema.users.firstName,
          userLastName: schema.users.lastName,
        })
        .from(schema.payments)
        .innerJoin(schema.users, eq(schema.payments.userId, schema.users.userId))
        .where(where)
        .orderBy(desc(schema.payments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.payments)
        .innerJoin(schema.users, eq(schema.payments.userId, schema.users.userId))
        .where(where),
    ]);

    const totalCount = countRows[0]?.total ?? 0;

    const [itemMap, adminNameMap] = await Promise.all([
      this.resolveItemMap(paymentRows),
      this.resolveUserNames(this.collectAdminIds(paymentRows)),
    ]);

    const data = paymentRows.map((p) => {
      const userName = buildDisplayName(p.userFirstName, p.userLastName, p.userEmail);
      return this.toOrderDto(
        p,
        itemMap.get(p.paymentId),
        p.userEmail,
        userName,
        adminNameMap,
      );
    });

    return {
      data,
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async adminGetOrder(orderId: string): Promise<OrderDto> {
    const [row] = await this.db
      .select({
        paymentId: schema.payments.paymentId,
        invoiceNo: schema.payments.invoiceNo,
        batchId: schema.payments.batchId,
        itemType: schema.payments.itemType,
        amount: schema.payments.amount,
        originalAmount: schema.payments.originalAmount,
        discountAmount: schema.payments.discountAmount,
        taxAmount: schema.payments.taxAmount,
        currency: schema.payments.currency,
        gateway: schema.payments.gateway,
        status: schema.payments.status,
        refundStatus: schema.payments.refundStatus,
        refundedAmount: schema.payments.refundedAmount,
        refundReason: schema.payments.refundReason,
        transactionId: schema.payments.transactionId,
        payerName: schema.payments.payerName,
        paymentProofUrl: schema.payments.paymentProofUrl,
        reviewedBy: schema.payments.reviewedBy,
        reviewNotes: schema.payments.reviewNotes,
        refundResolvedBy: schema.payments.refundResolvedBy,
        createdAt: schema.payments.createdAt,
        metadata: schema.payments.metadata,
        userEmail: schema.users.email,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
      })
      .from(schema.payments)
      .innerJoin(schema.users, eq(schema.payments.userId, schema.users.userId))
      .where(eq(schema.payments.paymentId, orderId));

    if (!row) throw new NotFoundException('Order not found.');

    const [itemMap, adminNameMap] = await Promise.all([
      this.resolveItemMap([row]),
      this.resolveUserNames(this.collectAdminIds([row])),
    ]);

    const userName = buildDisplayName(row.userFirstName, row.userLastName, row.userEmail);
    return this.toOrderDto(
      row,
      itemMap.get(row.paymentId),
      row.userEmail,
      userName,
      adminNameMap,
    );
  }

  async adminResolveRefund(
    orderId: string,
    adminId: string,
    dto: ResolveRefundDto,
  ): Promise<OrderDto> {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.paymentId, orderId));

    if (!payment) throw new NotFoundException('Order not found.');

    if (payment.refundStatus !== 'REQUESTED') {
      throw new BadRequestException(
        `Cannot resolve a refund in ${payment.refundStatus} state; only REQUESTED refunds can be resolved.`,
      );
    }

    const now = this.clock.now();

    if (dto.status === 'DECLINED') {
      await this.db
        .update(schema.payments)
        .set({
          refundStatus: 'DECLINED',
          refundResolvedAt: now,
          refundResolvedBy: adminId,
          updatedAt: now,
        })
        .where(eq(schema.payments.paymentId, orderId));

      await this.auditLog.record({
        action: 'order.refund.decline',
        targetType: 'payment',
        targetId: orderId,
        before: { refundStatus: payment.refundStatus },
        after: { refundStatus: 'DECLINED', note: dto.note ?? null },
      });

      return this.adminGetOrder(orderId);
    }

    const alreadyRefunded = parseFloat(payment.refundedAmount ?? '0');
    const remaining = parseFloat(payment.amount) - alreadyRefunded;
    const amount = dto.amount ?? remaining;

    if (amount <= 0) {
      throw new BadRequestException('A refund must be for a positive amount.');
    }
    if (amount > remaining + REFUND_EPSILON) {
      throw new ConflictException(
        `Only ${remaining.toFixed(2)} is left to refund on this order.`,
      );
    }

    const isFull = amount >= remaining - REFUND_EPSILON;
    const revoke = dto.revokeAccess ?? isFull;
    const refundedTotal = alreadyRefunded + amount;

    const revokedBatchIds = await this.db.transaction(async (tx) => {
      await tx
        .update(schema.payments)
        .set({
          refundStatus: 'APPROVED',
          refundResolvedAt: now,
          refundResolvedBy: adminId,
          refundedAmount: refundedTotal.toFixed(2),
          status: isFull ? 'REFUNDED' : payment.status,
          updatedAt: now,
        })
        .where(eq(schema.payments.paymentId, orderId));

      const revoked = revoke ? await this.revokeAccess(tx, payment) : [];

      await this.invoices.creditForPayment(
        tx,
        orderId,
        {
          reason: dto.note ?? payment.refundReason ?? 'Refund',
          amount,
        },
        adminId,
      );

      return revoked;
    });

    await this.auditLog.record({
      action: 'order.refund.approve',
      targetType: 'payment',
      targetId: orderId,
      before: {
        refundStatus: payment.refundStatus,
        refundedAmount: alreadyRefunded,
        status: payment.status,
      },
      after: {
        refundStatus: 'APPROVED',
        amount,
        refundedAmount: refundedTotal,
        isFullRefund: isFull,
        accessRevoked: revoke,
        revokedBatchIds,
        status: isFull ? 'REFUNDED' : payment.status,
      },
    });

    return this.adminGetOrder(orderId);
  }

  private async revokeAccess(
    tx: Transaction,
    payment: typeof schema.payments.$inferSelect,
  ): Promise<string[]> {
    if (payment.itemType !== 'BATCH' || payment.batchId === null) return [];
    const revoked = await tx
      .update(schema.batchEnrollments)
      .set({ status: 'REVOKED', updatedAt: this.clock.now() })
      .where(
        and(
          eq(schema.batchEnrollments.userId, payment.userId),
          eq(schema.batchEnrollments.paymentId, payment.paymentId),
          eq(schema.batchEnrollments.status, 'ACTIVE'),
        ),
      )
      .returning({ batchId: schema.batchEnrollments.batchId });
    return revoked.map((r) => r.batchId);
  }
}
