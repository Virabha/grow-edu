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
} from '../database/schema';
import { eq, and, inArray, desc, like, sql } from 'drizzle-orm';
import { EmailService } from '../email/email.service';
import { CouponsService } from '../coupons/coupons.service';
import { PhonePeService } from './phonepe/phonepe.service';

const MAX_PAGE_LIMIT = 50;
const PLATFORM_CURRENCY = 'INR';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RazorpayLib = require('razorpay');
const Razorpay = (RazorpayLib.default || RazorpayLib) as typeof RazorpayType;

export enum PaymentGateway {
  RAZORPAY = 'RAZORPAY',
  PHONEPE = 'PHONEPE',
  FREE = 'FREE',
}

@Injectable()
export class PaymentService {
  private razorpay: InstanceType<typeof Razorpay> | null = null;

  constructor(
    private configService: AppConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private emailService: EmailService,
    private couponsService: CouponsService,
    private phonepeService: PhonePeService,
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
      const course = await this.db.query.courses.findFirst({
        where: eq(courses.courseId, payload.courseId!),
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.status !== 'PUBLISHED') {
        throw new BadRequestException('Course is not published');
      }
      originalAmount = Number(course.price || 0);
      itemName = course.title;
    } else {
      const section = await this.db.query.courseSections.findFirst({
        where: eq(courseSections.sectionId, payload.sectionId!),
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

      couponId = validation.couponId!;
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
      } catch {}
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
    } catch {}

    return { success: true, paymentId: payment.paymentId, message: 'Enrolled successfully' };
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
    const updateData: { status: 'COMPLETED'; updatedAt: Date; metadata?: any; gatewayId?: string } = {
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
        ...((existing?.metadata as Record<string, any>) || {}),
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
      } catch {}
    }

    return payment;
  }

  async grantAccessForPayment(
    paymentId: string,
    itemType: 'COURSE' | 'SECTION',
    userId: string,
    courseId?: string,
    sectionId?: string,
  ) {
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
          });
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
      conditions.push(eq(payments.status, filters.status as any));
    }
    if (filters?.gateway) {
      conditions.push(eq(payments.gateway, filters.gateway as any));
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

  async initiatePhonePePayment(payload: {
    userId: string;
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
  }) {
    const { courseId, sectionId, originalAmount, amount, couponId, discountAmount } =
      await this.resolveItemAndCoupon(payload);

    if (amount <= 0) {
      throw new BadRequestException(
        'This item is free. Use the free-enrolment endpoint.',
      );
    }

    if (payload.itemType === 'COURSE' && courseId) {
      const [existing] = await this.db
        .select({ id: enrollments.enrollmentId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, courseId),
            eq(enrollments.userId, payload.userId),
            inArray(enrollments.status, ['ACTIVE', 'COMPLETED']),
          ),
        )
        .limit(1);
      if (existing) {
        throw new ConflictException('Already enrolled');
      }
    } else if (payload.itemType === 'SECTION' && sectionId) {
      const [existing] = await this.db
        .select({ id: sectionAccess.sectionAccessId })
        .from(sectionAccess)
        .where(
          and(
            eq(sectionAccess.userId, payload.userId),
            eq(sectionAccess.sectionId, sectionId),
          ),
        )
        .limit(1);
      if (existing) {
        throw new ConflictException('Already purchased');
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
        gateway: PaymentGateway.PHONEPE,
        status: 'PENDING',
        metadata: {
          couponCode: payload.couponCode || null,
        },
      })
      .returning();

    const merchantTransactionId = payment.paymentId;
    const amountInPaise = Math.round(amount * 100);
    const backendUrl = this.configService.backendUrl;

    const result = await this.phonepeService.initiate({
      merchantTransactionId,
      amountInPaise,
      userId: payload.userId,
      redirectUrl: `${this.configService.phonepeRedirectUrl}?paymentId=${merchantTransactionId}`,
      callbackUrl: `${backendUrl}/payments/phonepe/webhook`,
    });

    await this.db
      .update(payments)
      .set({ gatewayId: merchantTransactionId, updatedAt: new Date() })
      .where(eq(payments.paymentId, payment.paymentId));

    return {
      paymentId: payment.paymentId,
      paymentUrl: result.paymentUrl,
      amount,
      currency: PLATFORM_CURRENCY,
    };
  }

  async finalizePhonePePayment(merchantTransactionId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.paymentId, merchantTransactionId))
      .limit(1);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.gateway !== PaymentGateway.PHONEPE) {
      throw new BadRequestException('Not a PhonePe payment');
    }

    if (payment.status === 'COMPLETED') {
      return { status: 'COMPLETED' as const, paymentId: payment.paymentId };
    }
    if (payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      return { status: payment.status, paymentId: payment.paymentId };
    }

    const result = await this.phonepeService.checkStatus(merchantTransactionId);

    if (result.status === 'PENDING') {
      return { status: 'PENDING' as const, paymentId: payment.paymentId };
    }

    if (result.status === 'FAILED') {
      await this.db
        .update(payments)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(payments.paymentId, payment.paymentId));
      return { status: 'FAILED' as const, paymentId: payment.paymentId };
    }

    await this.db
      .update(payments)
      .set({
        status: 'COMPLETED',
        transactionId: result.providerTransactionId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(payments.paymentId, payment.paymentId));

    await this.grantAccessForPayment(
      payment.paymentId,
      payment.itemType as 'COURSE' | 'SECTION',
      payment.userId,
      payment.courseId || undefined,
      payment.sectionId || undefined,
    );

    if (payment.couponId && payment.courseId) {
      try {
        await this.couponsService.recordConsumedUsageLegacy({
          couponId: payment.couponId,
          userId: payment.userId,
          courseId: payment.courseId,
          paymentId: payment.paymentId,
          originalAmount: Number(payment.originalAmount ?? payment.amount),
          discountAmount: Number(payment.discountAmount ?? 0),
          finalAmount: Number(payment.amount),
        });
      } catch {}
    }

    return { status: 'COMPLETED' as const, paymentId: payment.paymentId };
  }

  async getPhonePeStatus(paymentId: string, userId: string) {
    const [payment] = await this.db
      .select({
        paymentId: payments.paymentId,
        userId: payments.userId,
        status: payments.status,
        gateway: payments.gateway,
      })
      .from(payments)
      .where(eq(payments.paymentId, paymentId))
      .limit(1);

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.gateway !== PaymentGateway.PHONEPE) {
      throw new BadRequestException('Not a PhonePe payment');
    }

    if (payment.status === 'PENDING') {
      return this.finalizePhonePePayment(paymentId);
    }
    return { status: payment.status, paymentId: payment.paymentId };
  }
}
