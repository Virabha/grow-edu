import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { AppConfigService } from '../config';
import type RazorpayType from 'razorpay';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  courses,
  courseSections,
  payments,
  enrollments,
  sectionAccess,
  users,
  siteSettings,
  paymentStatusEnum,
  paymentGatewayEnum,
} from '../database/schema';
import { eq, and, inArray, desc, like, sql } from 'drizzle-orm';
import { EmailService } from '../email/email.service';
import { CouponsService } from '../coupons/coupons.service';

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
  paymentId: string
) => Promise<void> | void;

@Injectable()
export class PaymentService {
  private razorpay: InstanceType<typeof Razorpay> | null = null;
  private batchEnrollHandler: BatchEnrollHandler | null = null;

  /** Registered at module init by BatchesService to avoid circular deps. */
  registerBatchEnrollHandler(handler: BatchEnrollHandler): void {
    this.batchEnrollHandler = handler;
  }

  constructor(
    private configService: AppConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private emailService: EmailService,
    private couponsService: CouponsService,
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

  /**
   * Shared validation: resolves course/section, validates it exists and is published,
   * and optionally applies a coupon.
   */
  private async resolveItemAndCoupon(payload: {
    userId: string;
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
  }) {
    if (!payload.courseId && !payload.sectionId) {
      throw new BadRequestException('courseId or sectionId is required');
    }

    let originalAmount = 0;
    let sectionId: string | null = null;
    let courseId: string | null = payload.courseId || null;
    let itemName = 'Course purchase';

    if (payload.itemType === 'COURSE') {
      if (!payload.courseId) throw new BadRequestException('courseId is required for COURSE items');
      const course = await this.db.query.courses.findFirst({
        where: eq(courses.courseId, payload.courseId),
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.status !== 'PUBLISHED') {
        throw new BadRequestException('Course is not published');
      }
      originalAmount = Number(course.price || 0);
      itemName = course.title;
    } else {
      if (!payload.sectionId) throw new BadRequestException('sectionId is required for SECTION items');
      const section = await this.db.query.courseSections.findFirst({
        where: eq(courseSections.sectionId, payload.sectionId),
        with: { course: true },
      });
      if (!section) throw new NotFoundException('Section not found');
      if (section.isDeleted) {
        throw new BadRequestException('Section is not available');
      }
      if (!section.sectionPrice) {
        throw new BadRequestException('Section is not individually purchasable');
      }
      originalAmount = Number(section.sectionPrice);
      courseId = section.courseId;
      sectionId = section.sectionId;
      itemName = `${section.course.title} - ${section.title}`;
    }

    let amount = originalAmount;
    let couponId: string | null = null;
    let discountAmount = 0;

    if (payload.couponCode && courseId) {
      const validation = await this.couponsService.validateCoupon(
        {
          couponCode: payload.couponCode,
          courseId,
          sectionId: sectionId || undefined,
          itemType: payload.itemType,
        },
        payload.userId,
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }

      if (!validation.couponId) throw new BadRequestException('Coupon validation returned no coupon ID');
      couponId = validation.couponId;
      discountAmount = Number(validation.discountAmount);
      amount = Number(validation.finalAmount);
    }

    return { courseId, sectionId, originalAmount, amount, couponId, discountAmount, itemName };
  }

  async enrollFree(payload: {
    userId: string;
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
  }) {
    const { courseId, sectionId, originalAmount, amount, couponId, discountAmount, itemName } =
      await this.resolveItemAndCoupon(payload);

    if (amount > 0) {
      throw new BadRequestException('This item requires payment. Use checkout instead.');
    }

    if (payload.itemType === 'COURSE' && courseId) {
      const [existingEnrollment] = await this.db
        .select({ id: enrollments.enrollmentId })
        .from(enrollments)
        .where(and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, payload.userId),
          inArray(enrollments.status, ['ACTIVE', 'COMPLETED']),
        ))
        .limit(1);
      if (existingEnrollment) {
        throw new ConflictException('Already enrolled');
      }
    } else if (payload.itemType === 'SECTION' && sectionId) {
      const [existingAccess] = await this.db
        .select({ id: sectionAccess.sectionAccessId })
        .from(sectionAccess)
        .where(and(eq(sectionAccess.userId, payload.userId), eq(sectionAccess.sectionId, sectionId)))
        .limit(1);
      if (existingAccess) {
        throw new ConflictException('Already enrolled');
      }
    }

    const [payment] = await this.db
      .insert(payments)
      .values({
        userId: payload.userId,
        courseId,
        sectionId,
        itemType: payload.itemType,
        amount: '0',
        originalAmount: String(originalAmount),
        discountAmount: String(discountAmount),
        couponId,
        currency: PLATFORM_CURRENCY,
        gateway: PaymentGateway.FREE,
        status: 'COMPLETED',
        metadata: {
          mode: payload.itemType,
          couponCode: payload.couponCode || null,
          freeEnrollment: true,
        },
      })
      .returning();

    if (couponId && courseId) {
      try {
        await this.couponsService.recordConsumedUsageLegacy({
          couponId,
          userId: payload.userId,
          courseId,
          paymentId: payment.paymentId,
          originalAmount,
          discountAmount,
          finalAmount: 0,
        });
      } catch { /* non-critical: swallow */ }
    }

    await this.grantAccessForPayment(
      payment.paymentId,
      payload.itemType,
      payload.userId,
      courseId || undefined,
      sectionId || undefined,
    );

    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.userId, payload.userId))
        .limit(1);

      if (user) {
        await this.emailService.sendPaymentConfirmationEmail({
          firstName: user.firstName,
          email: user.email,
          paymentId: payment.paymentId,
          amount: '0',
          currency: PLATFORM_CURRENCY,
          items: [{ name: itemName, type: payload.itemType }],
        });
      }
    } catch { /* non-critical: swallow */ }

    return { success: true, paymentId: payment.paymentId, message: 'Enrolled successfully' };
  }

  /**
   * Create a manual-QR pending payment.
   * Learner is shown QR code/bank details, then uploads proof. Admin reviews and approves.
   */
  async createManualQRPayment(payload: {
    userId: string;
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
    idempotencyKey?: string;
  }) {
    // Idempotency: if client re-sends the same key, return the existing payment.
    if (payload.idempotencyKey) {
      const [existing] = await this.db
        .select()
        .from(payments)
        .where(eq(payments.idempotencyKey, payload.idempotencyKey))
        .limit(1);
      if (existing) {
        return {
          paymentId: existing.paymentId,
          amount: Number(existing.amount),
          currency: PLATFORM_CURRENCY,
          status: existing.status,
          qrSettings: await this.getQRSettings(),
          reused: true,
        };
      }
    }

    const { courseId, sectionId, originalAmount, amount, couponId, discountAmount } =
      await this.resolveItemAndCoupon(payload);

    if (amount <= 0) {
      throw new BadRequestException('Item is free. Use the free-enroll endpoint instead.');
    }

    // Already-paid guard — block creating a new pending order when the user
    // already has a completed payment for this exact item.
    const itemCondition = courseId
      ? eq(payments.courseId, courseId)
      : sectionId
      ? eq(payments.sectionId, sectionId)
      : null;
    if (itemCondition) {
      const completed = await this.db.query.payments.findFirst({
        where: and(
          eq(payments.userId, payload.userId),
          itemCondition,
          eq(payments.status, 'COMPLETED'),
        ),
      });
      if (completed) {
        throw new BadRequestException(
          'You have already paid for this item. Check My Courses for access.',
        );
      }
      // If there's an existing PENDING or PROOF_UPLOADED payment for this
      // user+item, reuse it instead of creating a duplicate order.
      const existing = await this.db.query.payments.findFirst({
        where: and(
          eq(payments.userId, payload.userId),
          itemCondition,
          eq(payments.gateway, PaymentGateway.MANUAL_QR),
        ),
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
      if (
        existing &&
        (existing.status === 'PENDING' || existing.status === 'PROOF_UPLOADED')
      ) {
        return {
          paymentId: existing.paymentId,
          amount: Number(existing.amount),
          currency: PLATFORM_CURRENCY,
          status: existing.status,
          qrSettings: await this.getQRSettings(),
          reused: true,
        };
      }
    }

    const [payment] = await this.db
      .insert(payments)
      .values({
        userId: payload.userId,
        courseId,
        sectionId,
        itemType: payload.itemType,
        amount: String(amount),
        originalAmount: String(originalAmount),
        discountAmount: String(discountAmount),
        couponId,
        currency: PLATFORM_CURRENCY,
        gateway: PaymentGateway.MANUAL_QR,
        status: 'PENDING',
        idempotencyKey: payload.idempotencyKey ?? null,
        metadata: {
          mode: payload.itemType,
          couponCode: payload.couponCode || null,
        },
      })
      .returning();

    if (couponId && courseId) {
      try {
        await this.couponsService.reserveUsageForPayment({
          couponId,
          userId: payload.userId,
          courseId,
          paymentId: payment.paymentId,
          originalAmount,
          discountAmount,
          finalAmount: amount,
        });
      } catch (e) {
        await this.db
          .update(payments)
          .set({ status: 'FAILED', updatedAt: new Date() })
          .where(eq(payments.paymentId, payment.paymentId));
        throw e;
      }
    }

    return {
      paymentId: payment.paymentId,
      amount,
      currency: PLATFORM_CURRENCY,
      status: payment.status,
      qrSettings: await this.getQRSettings(),
    };
  }

  /**
   * Learner uploads proof of QR payment (screenshot URL + transaction id).
   * Enforces:
   *  - payment belongs to user, is MANUAL_QR, and is in a state that accepts proof
   *  - transactionId is unique across all payments (prevents one screenshot/txn
   *    being reused on a second checkout)
   *  - same (courseId|sectionId, user) doesn't already have a COMPLETED payment
   *    — covers the "already paid" case before bothering an admin
   */
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

    // Already-paid guard: same user + same item with a completed payment.
    const itemCondition = payment.courseId
      ? eq(payments.courseId, payment.courseId)
      : payment.sectionId
      ? eq(payments.sectionId, payment.sectionId)
      : null;

    if (itemCondition) {
      const alreadyPaid = await this.db.query.payments.findFirst({
        where: and(
          eq(payments.userId, payload.userId),
          itemCondition,
          eq(payments.status, 'COMPLETED'),
        ),
      });
      if (alreadyPaid && alreadyPaid.paymentId !== payment.paymentId) {
        throw new BadRequestException(
          'You have already paid for this item. No further payment is required.',
        );
      }
    }

    // Transaction ID uniqueness — case-insensitive trim.
    const normalisedTxn = payload.transactionId.trim();
    if (normalisedTxn.length < 4) {
      throw new BadRequestException('Transaction ID is too short');
    }
    const duplicate = await this.db.query.payments.findFirst({
      where: and(
        eq(payments.transactionId, normalisedTxn),
        // ignore the current payment row itself (re-upload after correction)
      ),
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

  /**
   * Admin approves a manual-QR payment after reviewing proof.
   */
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

    // Grant access before marking COMPLETED: if access grant throws, the payment stays
    // in PROOF_UPLOADED so the admin can retry without double-granting.
    await this.grantAccessForPayment(
      paymentId,
      payment.itemType,
      payment.userId,
      payment.courseId || undefined,
      payment.sectionId || undefined,
    );

    // Link the resulting enrollment back to this payment row.
    let linkedEnrollmentId: string | undefined;
    if (payment.itemType === 'COURSE' && payment.courseId) {
      const [enrollment] = await this.db
        .select({ enrollmentId: enrollments.enrollmentId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, payment.userId),
            eq(enrollments.courseId, payment.courseId),
          ),
        )
        .limit(1);
      linkedEnrollmentId = enrollment?.enrollmentId;
    }

    const now = new Date();
    const [updated] = await this.db
      .update(payments)
      .set({
        status: 'COMPLETED',
        reviewedAt: now,
        reviewedBy: reviewerId,
        reviewNotes: notes || null,
        updatedAt: now,
        ...(linkedEnrollmentId ? { enrollmentId: linkedEnrollmentId } : {}),
      })
      .where(and(eq(payments.paymentId, paymentId), eq(payments.status, 'PROOF_UPLOADED')))
      .returning({ paymentId: payments.paymentId });

    // Consume coupon reservation if any
    if (payment.couponId) {
      try {
        await this.couponsService.consumeReservationByPayment(paymentId);
      } catch { /* non-critical: swallow */ }
    }

    // Confirmation email — only if this request won the status-update race
    if (!updated) return { success: true };
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.userId, payment.userId))
        .limit(1);

      if (user) {
        const items: Array<{ name: string; type: 'COURSE' | 'SECTION' }> = [];
        if (payment.itemType === 'COURSE' && payment.courseId) {
          const [course] = await this.db
            .select()
            .from(courses)
            .where(eq(courses.courseId, payment.courseId))
            .limit(1);
          if (course) items.push({ name: course.title, type: 'COURSE' });
        } else if (payment.itemType === 'SECTION' && payment.sectionId) {
          const [section] = await this.db
            .select()
            .from(courseSections)
            .where(eq(courseSections.sectionId, payment.sectionId))
            .limit(1);
          if (section) items.push({ name: section.title, type: 'SECTION' });
        }
        if (items.length > 0) {
          await this.emailService.sendPaymentConfirmationEmail({
            firstName: user.firstName,
            email: user.email,
            paymentId: payment.paymentId,
            amount: payment.amount,
            currency: payment.currency,
            items,
          });
        }
      }
    } catch { /* non-critical: swallow */ }

    return { success: true, message: 'Payment approved and access granted' };
  }

  /**
   * Admin rejects a manual-QR payment.
   */
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

    // Cancel coupon reservation
    if (payment.couponId) {
      try {
        await this.couponsService.cancelReservationByPayment(paymentId);
      } catch { /* non-critical: swallow */ }
    }

    return { success: true, message: 'Payment rejected' };
  }

  /**
   * Admin lists payments awaiting review (status = PROOF_UPLOADED).
   */
  async getPendingReviewPayments(filters?: { page?: number; limit?: number }) {
    const limit = Math.min(filters?.limit ?? 50, MAX_PAGE_LIMIT);
    const page = filters?.page ?? 1;
    const offset = (page - 1) * limit;

    const [rows, countRes] = await Promise.all([
      this.db.query.payments.findMany({
        where: eq(payments.status, 'PROOF_UPLOADED'),
        with: { user: true, course: true, section: true },
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

  /**
   * QR/Bank settings stored in site_settings table (key-value).
   */
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
                target: siteSettings.key,
                set: { value, updatedAt: new Date() },
              }),
      ),
    );

    return this.getQRSettings();
  }

  /**
   * Razorpay (kept for future re-enable; not used by checkout currently).
   */
  async createRazorpayOrder(payload: {
    userId: string;
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
  }) {
    if (!this.razorpay) {
      throw new BadRequestException('Razorpay is not configured');
    }
    const { courseId, sectionId, originalAmount, amount, couponId, discountAmount, itemName } =
      await this.resolveItemAndCoupon(payload);
    void itemName;

    const [payment] = await this.db
      .insert(payments)
      .values({
        userId: payload.userId,
        courseId,
        sectionId,
        itemType: payload.itemType,
        amount: String(amount),
        originalAmount: String(originalAmount),
        discountAmount: String(discountAmount),
        couponId,
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
    const updateData: { status: 'COMPLETED'; updatedAt: Date; metadata?: Record<string, unknown>; gatewayId?: string } = {
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

    if (payment && payment.couponId) {
      try {
        const consumed = await this.couponsService.consumeReservationByPayment(payment.paymentId);
        if (!consumed && payment.courseId) {
          await this.couponsService.recordConsumedUsageLegacy({
            couponId: payment.couponId,
            userId: payment.userId,
            courseId: payment.courseId,
            paymentId: payment.paymentId,
            originalAmount: Number(payment.originalAmount || payment.amount),
            discountAmount: Number(payment.discountAmount || 0),
            finalAmount: Number(payment.amount),
          });
        }
      } catch { /* non-critical: swallow */ }
    }

    return payment;
  }

  async grantAccessForPayment(
    paymentId: string,
    itemType: 'COURSE' | 'SECTION' | 'BATCH',
    userId: string,
    courseId?: string,
    sectionId?: string,
  ) {
    if (itemType === 'BATCH') {
      const payment = await this.db.query.payments.findFirst({
        where: eq(payments.paymentId, paymentId),
      });
      const meta = (payment?.metadata ?? {}) as Record<string, string>;
      const batchId = meta.batchId;
      if (batchId && this.batchEnrollHandler) {
        await this.batchEnrollHandler(batchId, userId, paymentId);
      }
      return;
    }
    if (itemType === 'COURSE' && courseId) {
      const [existingActive] = await this.db
        .select({ id: enrollments.enrollmentId })
        .from(enrollments)
        .where(and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, userId),
          inArray(enrollments.status, ['ACTIVE', 'COMPLETED']),
        ))
        .limit(1);

      if (!existingActive) {
        const [existingRevoked] = await this.db
          .select({ id: enrollments.enrollmentId })
          .from(enrollments)
          .where(and(
            eq(enrollments.courseId, courseId),
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'REVOKED'),
          ))
          .limit(1);

        if (existingRevoked) {
          await this.db
            .update(enrollments)
            .set({ status: 'ACTIVE' })
            .where(eq(enrollments.enrollmentId, existingRevoked.id));
        } else {
          await this.db.insert(enrollments).values({
            userId,
            courseId,
            status: 'ACTIVE',
          }).onConflictDoNothing();
        }
      }

      await this.db
        .delete(sectionAccess)
        .where(and(eq(sectionAccess.userId, userId), eq(sectionAccess.courseId, courseId)));
    }

    if (itemType === 'SECTION' && sectionId && courseId) {
      const [existingAccess] = await this.db
        .select({ id: sectionAccess.sectionAccessId })
        .from(sectionAccess)
        .where(and(eq(sectionAccess.userId, userId), eq(sectionAccess.sectionId, sectionId)))
        .limit(1);

      if (!existingAccess) {
        await this.db.insert(sectionAccess).values({
          userId,
          courseId,
          sectionId,
          source: 'SECTION_PURCHASE',
          paymentId,
        });
      }
    }
  }

  async getPaymentById(id: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.paymentId, id),
      with: {
        user: true,
        course: true,
        section: true,
        coupon: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getMyPayment(id: string, userId: string) {
    const payment = await this.db.query.payments.findFirst({
      where: and(eq(payments.paymentId, id), eq(payments.userId, userId)),
      with: { course: true, section: true },
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
          courseId: payments.courseId,
          sectionId: payments.sectionId,
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
