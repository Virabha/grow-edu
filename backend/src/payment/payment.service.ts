import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AppConfigService } from '../config';
import type RazorpayType from 'razorpay';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  batches,
  payments,
  users,
  siteSettings,
  paymentStatusEnum,
  paymentGatewayEnum,
} from '../database/schema';
import { Queryable } from '../database/transaction';
import { eq, and, inArray, desc, like, sql } from 'drizzle-orm';
import { EmailService } from '../email/email.service';
import { ContractsService } from '../corporate/contracts.service';
import { AuditLogService } from '../audit/audit-log.service';
import { InvoicesService } from '../invoices/invoices.service';

const MAX_PAGE_LIMIT = 100;
const PLATFORM_CURRENCY = 'INR';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RazorpayLib = require('razorpay');
const Razorpay = (RazorpayLib.default || RazorpayLib) as typeof RazorpayType;

export enum PaymentGateway {
  RAZORPAY = 'RAZORPAY',
  MANUAL_QR = 'MANUAL_QR',
  FREE = 'FREE',
}

const QR_SETTING_KEYS = {
  qrImageUrl: 'payment.qr.image_url',
  upiId: 'payment.qr.upi_id',
  bankName: 'payment.qr.bank_name',
  bankAccountNumber: 'payment.qr.bank_account_number',
  bankIfsc: 'payment.qr.bank_ifsc',
  bankAccountHolder: 'payment.qr.bank_account_holder',
  instructions: 'payment.qr.instructions',
} as const;

export interface QRPaymentSettings {
  qrImageUrl: string | null;
  upiId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankAccountHolder: string | null;
  instructions: string | null;
}

type BatchEnrollHandler = (
  batchId: string,
  userId: string,
  paymentId: string,
  tx: Queryable,
) => Promise<void>;

type BatchEnrolledNotifier = (
  batchId: string,
  userId: string,
) => Promise<void>;

@Injectable()
export class PaymentService {
  private razorpay: InstanceType<typeof Razorpay> | null = null;
  private batchEnrollHandler: BatchEnrollHandler | null = null;
  private batchEnrolledNotifier: BatchEnrolledNotifier | null = null;

  registerBatchEnrollHandler(handler: BatchEnrollHandler): void {
    this.batchEnrollHandler = handler;
  }

  registerBatchEnrolledNotifier(notifier: BatchEnrolledNotifier): void {
    this.batchEnrolledNotifier = notifier;
  }

  constructor(
    private configService: AppConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private emailService: EmailService,
    private readonly contracts: ContractsService,
    private readonly auditLog: AuditLogService,
    private readonly invoices: InvoicesService,
  ) {
    const razorpayKeyId = this.configService.razorpayKeyId;
    const razorpayKeySecret = this.configService.razorpayKeySecret;
    if (razorpayKeyId && razorpayKeySecret) {
      this.razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });
    }
  }

  async uploadPaymentProof(payload: {
    paymentId: string;
    userId: string;
    proofUrl: string;
    transactionId: string;
    payerName?: string;
  }) {
    const payment = await this.db.query.payments.findFirst({
      where: and(
        eq(payments.paymentId, payload.paymentId),
        eq(payments.userId, payload.userId),
      ),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.gateway !== 'MANUAL_QR') {
      throw new BadRequestException('Proof upload only applies to manual QR payments');
    }

    if (payment.status !== 'PENDING' && payment.status !== 'PROOF_UPLOADED') {
      throw new BadRequestException(`Cannot upload proof for ${payment.status} payment`);
    }

    if (payment.batchId) {
      const alreadyPaid = await this.db.query.payments.findFirst({
        where: and(
          eq(payments.userId, payload.userId),
          eq(payments.batchId, payment.batchId),
          eq(payments.status, 'COMPLETED'),
        ),
      });
      if (alreadyPaid && alreadyPaid.paymentId !== payment.paymentId) {
        throw new BadRequestException(
          'You have already paid for this item. No further payment is required.',
        );
      }
    }

    const normalisedTxn = payload.transactionId.trim();
    if (normalisedTxn.length < 4) {
      throw new BadRequestException('Transaction ID is too short');
    }
    const duplicate = await this.db.query.payments.findFirst({
      where: eq(payments.transactionId, normalisedTxn),
    });
    if (duplicate && duplicate.paymentId !== payment.paymentId) {
      throw new BadRequestException(
        'This transaction ID has already been submitted with another payment.',
      );
    }

    const now = new Date();
    const [updated] = await this.db
      .update(payments)
      .set({
        paymentProofUrl: payload.proofUrl,
        transactionId: normalisedTxn,
        payerName: payload.payerName?.trim() || null,
        proofUploadedAt: now,
        status: 'PROOF_UPLOADED',
        updatedAt: now,
      })
      .where(eq(payments.paymentId, payload.paymentId))
      .returning();

    return updated;
  }

  async approvePayment(paymentId: string, reviewerId: string, notes?: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.paymentId, paymentId),
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'COMPLETED') {
      return { success: true, message: 'Payment already completed' };
    }
    if (payment.status !== 'PROOF_UPLOADED' && payment.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve a ${payment.status} payment`);
    }

    const now = new Date();
    const approved = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(payments)
        .set({
          status: 'COMPLETED',
          reviewedAt: now,
          reviewedBy: reviewerId,
          reviewNotes: notes || null,
          updatedAt: now,
        })
        .where(
          and(
            eq(payments.paymentId, paymentId),
            inArray(payments.status, ['PROOF_UPLOADED', 'PENDING']),
          ),
        )
        .returning({ paymentId: payments.paymentId });

      if (!updated) return false;

      if (payment.itemType === 'CORPORATE_CONTRACT') {
        if (!payment.corporateContractId) {
          throw new BadRequestException(
            'Corporate payment is not linked to a contract',
          );
        }
        await this.contracts.activateForPayment(payment.corporateContractId, tx);
        await this.invoices.issueForPayment(paymentId, tx);
        return true;
      }

      if (!payment.batchId) {
        throw new BadRequestException('Payment is not linked to a batch');
      }
      if (!this.batchEnrollHandler) {
        throw new BadRequestException('Enrolment is not available right now');
      }
      await this.batchEnrollHandler(
        payment.batchId,
        payment.userId,
        paymentId,
        tx,
      );
      await this.invoices.issueForPayment(paymentId, tx);
      return true;
    });

    if (!approved) return { success: true };

    await this.auditLog.record({
      action: 'payment.approve',
      targetType: 'payment',
      targetId: paymentId,
      before: { status: payment.status },
      after: { status: 'COMPLETED', notes: notes ?? null },
    });

    if (payment.itemType === 'CORPORATE_CONTRACT') {
      return { success: true, message: 'Payment approved and contract activated' };
    }

    if (payment.batchId && this.batchEnrolledNotifier) {
      await this.batchEnrolledNotifier(payment.batchId, payment.userId);
    }
    await this.sendConfirmation(payment);
    return { success: true, message: 'Payment approved and access granted' };
  }

  private async sendConfirmation(payment: typeof payments.$inferSelect) {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.userId, payment.userId))
        .limit(1);
      if (!user || !payment.batchId) return;

      const [batch] = await this.db
        .select({ title: batches.title })
        .from(batches)
        .where(eq(batches.batchId, payment.batchId))
        .limit(1);
      if (!batch) return;

      await this.emailService.sendPaymentConfirmationEmail({
        firstName: user.firstName,
        email: user.email,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        items: [{ name: batch.title, type: 'BATCH' }],
      });
    } catch { /* non-critical: swallow */ }
  }

  async rejectPayment(paymentId: string, reviewerId: string, notes: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.paymentId, paymentId),
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot reject a completed payment');
    }

    const now = new Date();
    await this.db
      .update(payments)
      .set({
        status: 'REJECTED',
        reviewedAt: now,
        reviewedBy: reviewerId,
        reviewNotes: notes,
        updatedAt: now,
      })
      .where(eq(payments.paymentId, paymentId));

    await this.auditLog.record({
      action: 'payment.reject',
      targetType: 'payment',
      targetId: paymentId,
      before: { status: payment.status },
      after: { status: 'REJECTED', notes },
    });

    return { success: true, message: 'Payment rejected' };
  }

  async getPendingReviewPayments(filters?: { page?: number; limit?: number }) {
    const limit = Math.min(filters?.limit ?? 50, MAX_PAGE_LIMIT);
    const page = filters?.page ?? 1;
    const offset = (page - 1) * limit;

    const [rows, countRes] = await Promise.all([
      this.db.query.payments.findMany({
        where: eq(payments.status, 'PROOF_UPLOADED'),
        with: { user: true, batch: true },
        orderBy: [desc(payments.proofUploadedAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(eq(payments.status, 'PROOF_UPLOADED')),
    ]);

    const total = Number(countRes[0]?.count ?? 0);
    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getQRSettings(): Promise<QRPaymentSettings> {
    const keys = Object.values(QR_SETTING_KEYS);
    const rows = await this.db
      .select()
      .from(siteSettings)
      .where(inArray(siteSettings.key, keys));

    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      qrImageUrl: (map.get(QR_SETTING_KEYS.qrImageUrl) as string) ?? null,
      upiId: (map.get(QR_SETTING_KEYS.upiId) as string) ?? null,
      bankName: (map.get(QR_SETTING_KEYS.bankName) as string) ?? null,
      bankAccountNumber: (map.get(QR_SETTING_KEYS.bankAccountNumber) as string) ?? null,
      bankIfsc: (map.get(QR_SETTING_KEYS.bankIfsc) as string) ?? null,
      bankAccountHolder: (map.get(QR_SETTING_KEYS.bankAccountHolder) as string) ?? null,
      instructions: (map.get(QR_SETTING_KEYS.instructions) as string) ?? null,
    };
  }

  async updateQRSettings(input: Partial<QRPaymentSettings>): Promise<QRPaymentSettings> {
    const entries: Array<[string, string | null]> = [
      [QR_SETTING_KEYS.qrImageUrl, input.qrImageUrl ?? null],
      [QR_SETTING_KEYS.upiId, input.upiId ?? null],
      [QR_SETTING_KEYS.bankName, input.bankName ?? null],
      [QR_SETTING_KEYS.bankAccountNumber, input.bankAccountNumber ?? null],
      [QR_SETTING_KEYS.bankIfsc, input.bankIfsc ?? null],
      [QR_SETTING_KEYS.bankAccountHolder, input.bankAccountHolder ?? null],
      [QR_SETTING_KEYS.instructions, input.instructions ?? null],
    ];

    await Promise.all(
      entries.map(([key, value]) =>
        value === null
          ? this.db.delete(siteSettings).where(eq(siteSettings.key, key))
          : this.db
              .insert(siteSettings)
              .values({ key, value })
              .onConflictDoUpdate({
                target: [siteSettings.organizationId, siteSettings.key],
                set: { value, updatedAt: new Date() },
              }),
      ),
    );

    return this.getQRSettings();
  }

  async createRazorpayOrder(payload: { userId: string; batchId: string }) {
    if (!this.razorpay) {
      throw new BadRequestException('Razorpay is not configured');
    }
    const [batch] = await this.db
      .select({ price: batches.price, currency: batches.currency })
      .from(batches)
      .where(and(eq(batches.batchId, payload.batchId), eq(batches.isDeleted, false)))
      .limit(1);
    if (!batch) throw new NotFoundException('Batch not found');

    const amount = Number(batch.price);
    const [payment] = await this.db
      .insert(payments)
      .values({
        userId: payload.userId,
        batchId: payload.batchId,
        itemType: 'BATCH',
        amount: String(amount),
        originalAmount: String(amount),
        currency: PLATFORM_CURRENCY,
        gateway: PaymentGateway.RAZORPAY,
        status: 'PENDING',
      })
      .returning();

    const order = await this.razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: PLATFORM_CURRENCY,
      receipt: payment.paymentId,
    });

    await this.db
      .update(payments)
      .set({ gatewayId: order.id })
      .where(eq(payments.paymentId, payment.paymentId));

    return {
      paymentId: payment.paymentId,
      orderId: order.id,
      amount,
      currency: PLATFORM_CURRENCY,
      razorpayKeyId: this.configService.razorpayKeyId,
    };
  }

  async markPaymentCompleted(paymentId: string, gatewayPaymentId?: string) {
    const updateData: {
      status: 'COMPLETED';
      updatedAt: Date;
      metadata?: Record<string, unknown>;
    } = {
      status: 'COMPLETED',
      updatedAt: new Date(),
    };

    if (gatewayPaymentId) {
      const [existing] = await this.db
        .select({ metadata: payments.metadata })
        .from(payments)
        .where(eq(payments.paymentId, paymentId))
        .limit(1);

      updateData.metadata = {
        ...((existing?.metadata as Record<string, unknown>) || {}),
        gatewayPaymentId,
      };
    }

    const [payment] = await this.db
      .update(payments)
      .set(updateData)
      .where(eq(payments.paymentId, paymentId))
      .returning();

    if (payment) {
      await this.invoices.issueForPayment(paymentId);
    }

    return payment;
  }

  async getPaymentById(id: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.paymentId, id),
      with: { user: true, batch: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getMyPayment(id: string, userId: string) {
    const payment = await this.db.query.payments.findFirst({
      where: and(eq(payments.paymentId, id), eq(payments.userId, userId)),
      with: { batch: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getAllPayments(filters?: {
    search?: string;
    limit?: number;
    page?: number;
    status?: string;
    gateway?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const limit = Math.min(filters?.limit || 100, MAX_PAGE_LIMIT);
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (filters?.search) {
      conditions.push(like(payments.paymentId, `%${filters.search}%`));
    }
    if (filters?.status) {
      conditions.push(eq(payments.status, filters.status as (typeof paymentStatusEnum.enumValues)[number]));
    }
    if (filters?.gateway) {
      conditions.push(eq(payments.gateway, filters.gateway as (typeof paymentGatewayEnum.enumValues)[number]));
    }
    if (filters?.dateFrom) {
      conditions.push(sql`${payments.createdAt} >= ${new Date(filters.dateFrom)}`);
    }
    if (filters?.dateTo) {
      conditions.push(sql`${payments.createdAt} <= ${new Date(filters.dateTo)}`);
    }
    const whereClause = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : and(...conditions)
      : undefined;

    const [results, countResult] = await Promise.all([
      this.db
        .select({
          paymentId: payments.paymentId,
          userId: payments.userId,
          amount: payments.amount,
          currency: payments.currency,
          status: payments.status,
          gateway: payments.gateway,
          gatewayId: payments.gatewayId,
          createdAt: payments.createdAt,
          itemType: payments.itemType,
          batchId: payments.batchId,
          corporateContractId: payments.corporateContractId,
          paymentProofUrl: payments.paymentProofUrl,
          proofUploadedAt: payments.proofUploadedAt,
          reviewedAt: payments.reviewedAt,
        })
        .from(payments)
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
