import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { AppConfigService } from '../config';
import Stripe from 'stripe';
import type RazorpayType from 'razorpay';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { courses, courseSections, payments, enrollments, sectionAccess, cartItems, users } from '../database/schema';
import { eq, and, inArray, desc, like, sql } from 'drizzle-orm';
import { EmailService } from '../email/email.service';
import { CouponsService } from '../coupons/coupons.service';

const MAX_PAGE_LIMIT = 50;
const PLATFORM_CURRENCY = 'INR';

// Use require for razorpay to handle CommonJS/ESM compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RazorpayLib = require('razorpay');
const Razorpay = (RazorpayLib.default || RazorpayLib) as typeof RazorpayType;

export enum PaymentGateway {
  RAZORPAY = 'RAZORPAY',
  STRIPE_US = 'STRIPE_US',
  STRIPE_UAE = 'STRIPE_UAE',
  FREE = 'FREE',
}

@Injectable()
export class PaymentService {
  private razorpay: InstanceType<typeof Razorpay> | null = null;
  private stripeUS: Stripe | undefined;
  private stripeUAE: Stripe | undefined;

  constructor(
    private configService: AppConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private emailService: EmailService,
    private couponsService: CouponsService,
  ) {
    // Initialize Razorpay for India
    const razorpayKeyId = this.configService.razorpayKeyId;
    const razorpayKeySecret = this.configService.razorpayKeySecret;
    if (razorpayKeyId && razorpayKeySecret) {
      this.razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });
    }

    // Initialize Stripe for USA
    const stripeUsKey = this.configService.stripeUsSecretKey;
    if (stripeUsKey) {
      this.stripeUS = new Stripe(stripeUsKey, { apiVersion: '2023-10-16' });
    }

    // Initialize Stripe for UAE
    const stripeUaeKey = this.configService.stripeUaeSecretKey;
    if (stripeUaeKey) {
      this.stripeUAE = new Stripe(stripeUaeKey, { apiVersion: '2023-10-16' });
    }
  }

  /**
   * Shared validation: resolves course/section, validates it exists and is published,
   * and optionally applies a coupon. Used by both enrollFree() and createCheckoutSession().
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

    // Apply coupon if provided
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

    // Check if already enrolled
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

    // Create payment record for audit trail
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

    // Record coupon usage if applicable
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

    // Grant access
    await this.grantAccessForPayment(
      payment.paymentId,
      payload.itemType,
      payload.userId,
      courseId || undefined,
      sectionId || undefined,
    );

    // Send confirmation email
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

  async createCheckoutSession(payload: {
    userId: string;
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
  }) {
    const { courseId, sectionId, originalAmount, amount, couponId, discountAmount, itemName } =
      await this.resolveItemAndCoupon(payload);

    const successUrl = payload.successUrl || `${this.configService.frontendUrl}/payment/success`;
    const cancelUrl = payload.cancelUrl || `${this.configService.frontendUrl}/payment/failure`;

    if (!this.stripeUAE) {
      throw new BadRequestException('Stripe is not configured for UAE gateway');
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
        gateway: PaymentGateway.STRIPE_UAE,
        status: 'PENDING',
        metadata: {
          mode: payload.itemType,
          couponCode: payload.couponCode || null,
          ...payload.metadata,
        },
      })
      .returning();

    // Reserve coupon usage atomically for this payment (prevents races).
    // If reservation fails, mark payment failed and stop.
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
      } catch (e: any) {
        await this.db
          .update(payments)
          .set({ status: 'FAILED', updatedAt: new Date() })
          .where(eq(payments.paymentId, payment.paymentId));
        throw e;
      }
    }

    const separator = successUrl.includes('?') ? '&' : '?';
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripeUAE.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: PLATFORM_CURRENCY.toLowerCase(),
              product_data: {
                name: itemName,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${successUrl}${separator}paymentId=${payment.paymentId}&sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          paymentId: payment.paymentId,
          userId: payload.userId,
          courseId: courseId || '',
          sectionId: sectionId || '',
          itemType: payload.itemType,
          ...payload.metadata,
        },
      });
    } catch (error) {
      // Cancel reservation so it doesn't block limits until TTL
      if (couponId) {
        try {
          await this.couponsService.cancelReservationByPayment(payment.paymentId);
        } catch {}
      }
      await this.db
        .update(payments)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(payments.paymentId, payment.paymentId));
      throw error;
    }

    await this.db
      .update(payments)
      .set({
        gatewayId: session.id,
      })
      .where(eq(payments.paymentId, payment.paymentId));

    return {
      paymentId: payment.paymentId,
      checkoutUrl: session.url,
      sessionId: session.id,
      clientReferenceId: session.client_reference_id,
    };
  }

  async createPayment(
    gateway: PaymentGateway,
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ) {
    switch (gateway) {
      case PaymentGateway.RAZORPAY:
        return this.createRazorpayPayment(amount, currency, metadata);
      case PaymentGateway.STRIPE_US:
        return this.createStripePayment(this.stripeUS, amount, currency, metadata);
      case PaymentGateway.STRIPE_UAE:
        return this.createStripePayment(this.stripeUAE, amount, currency, metadata);
      default:
        throw new Error('Invalid payment gateway');
    }
  }

  private async createRazorpayPayment(
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ) {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }
    const order = await this.razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: metadata.receiptId,
    });
    return order;
  }

  private async createStripePayment(
    stripe: Stripe | undefined,
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata,
    });
    return paymentIntent;
  }

  async markPaymentCompleted(paymentId: string, gatewayPaymentId?: string) {
    // Note: We intentionally do NOT overwrite gatewayId here.
    // gatewayId stores the Stripe session ID which is needed for session-based verification.
    // The payment_intent can be passed but we store it in metadata instead of overwriting gatewayId.
    const updateData: { status: 'COMPLETED'; updatedAt: Date; metadata?: any } = {
      status: 'COMPLETED',
      updatedAt: new Date(),
    };

    // If gatewayPaymentId (payment_intent) is provided, store it in metadata
    if (gatewayPaymentId) {
      const [existingPayment] = await this.db
        .select({ metadata: payments.metadata })
        .from(payments)
        .where(eq(payments.paymentId, paymentId))
        .limit(1);

      updateData.metadata = {
        ...(existingPayment?.metadata as Record<string, any> || {}),
        stripePaymentIntentId: gatewayPaymentId,
      };
    }

    const [payment] = await this.db
      .update(payments)
      .set(updateData)
      .where(eq(payments.paymentId, paymentId))
      .returning();

    if (payment) {
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
            if (course) {
              items.push({ name: course.title, type: 'COURSE' });
            }
          } else if (payment.itemType === 'SECTION' && payment.sectionId) {
            const [section] = await this.db
              .select()
              .from(courseSections)
              .where(eq(courseSections.sectionId, payment.sectionId))
              .limit(1);
            if (section) {
              items.push({ name: section.title, type: 'SECTION' });
            }
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
      } catch {}

      // Record coupon usage if a coupon was applied
      if (payment.couponId && payment.courseId) {
        try {
          // Prefer consuming a prior reservation; fallback to legacy insert if missing.
          const consumed = await this.couponsService.consumeReservationByPayment(
            payment.paymentId,
          );
          if (!consumed) {
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
    }

    return payment;
  }

  async createBulkCheckoutSession(payload: {
    userId: string;
    cartItemIds: string[];
    couponCode?: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    if (!payload.cartItemIds || payload.cartItemIds.length === 0) {
      throw new BadRequestException('cartItemIds array is required and cannot be empty');
    }

    const successUrl = payload.successUrl || `${this.configService.frontendUrl}/payment/success`;
    const cancelUrl = payload.cancelUrl || `${this.configService.frontendUrl}/payment/failure`;

    const items = await this.db.query.cartItems.findMany({
      where: and(
        eq(cartItems.userId, payload.userId),
        inArray(cartItems.cartItemId, payload.cartItemIds)
      ),
      with: {
        course: true,
        section: {
          with: {
            course: true,
          },
        },
      },
    });

    if (items.length === 0) {
      throw new NotFoundException('No cart items found');
    }

    if (items.length !== payload.cartItemIds.length) {
      throw new BadRequestException('Some cart items were not found');
    }

    // Optional bulk coupon application (apply only to eligible items)
    const bulkCoupon =
      payload.couponCode?.trim()
        ? await this.couponsService.validateCouponForCartItems(
            { couponCode: payload.couponCode, cartItemIds: payload.cartItemIds },
            payload.userId,
          )
        : null;

    const byCartId = new Map(
      (bulkCoupon?.items || []).map((r) => [r.cartItemId, r]),
    );

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const insertedPayments: Array<{
      paymentId: string;
      cartItemId: string;
      itemType: 'COURSE' | 'SECTION';
      courseId: string | null;
      sectionId: string | null;
      amount: number;
      originalAmount: number;
      discountAmount: number;
      couponId: string | null;
      currency: string;
      itemName: string;
    }> = [];

    for (const item of items) {
      const originalAmount = Number(item.price || 0);
      const currency = PLATFORM_CURRENCY;

      let itemName = 'Course purchase';
      if (item.itemType === 'COURSE' && item.course) {
        itemName = item.course.title || 'Course';
      } else if (item.itemType === 'SECTION' && item.section) {
        itemName = `${item.section.course?.title || 'Course'} - ${item.section.title || 'Section'}`;
      }

      const couponItem = byCartId.get(item.cartItemId);
      const shouldDiscount = !!(bulkCoupon?.valid && couponItem?.valid);

      let amount = originalAmount;
      let discountAmount = 0;
      let couponId: string | null = null;

      if (shouldDiscount && bulkCoupon?.couponId) {
        amount = Number(couponItem!.finalAmount);
        discountAmount = Number(couponItem!.discountAmount);
        couponId = bulkCoupon.couponId;
      }

      const [payment] = await this.db
        .insert(payments)
        .values({
          userId: payload.userId,
          courseId: item.courseId,
          sectionId: item.sectionId,
          itemType: item.itemType,
          amount: String(amount),
          originalAmount: String(originalAmount),
          discountAmount: String(discountAmount),
          couponId,
          currency: PLATFORM_CURRENCY,
          gateway: PaymentGateway.STRIPE_UAE,
          status: 'PENDING',
          metadata: {
            mode: item.itemType,
            cartItemId: item.cartItemId,
            couponCode: payload.couponCode || null,
            bulkCouponApplied: Boolean(couponId),
          },
        })
        .returning();

      // If we intended to apply coupon, reserve usage. If reservation fails, fall back to no-coupon.
      if (couponId && payment.courseId) {
        try {
          await this.couponsService.reserveUsageForPayment({
            couponId,
            userId: payload.userId,
            courseId: payment.courseId,
            paymentId: payment.paymentId,
            originalAmount,
            discountAmount,
            finalAmount: amount,
          });
        } catch (e) {
          // Fallback: remove coupon and restore original price for this payment
          await this.db
            .update(payments)
            .set({
              couponId: null,
              discountAmount: '0',
              amount: String(originalAmount),
              updatedAt: new Date(),
            })
            .where(eq(payments.paymentId, payment.paymentId));

          couponId = null;
          discountAmount = 0;
          amount = originalAmount;
        }
      }

      insertedPayments.push({
        paymentId: payment.paymentId,
        cartItemId: item.cartItemId,
        itemType: item.itemType,
        courseId: item.courseId,
        sectionId: item.sectionId,
        amount,
        originalAmount,
        discountAmount,
        couponId,
        currency,
        itemName,
      });

      lineItems.push({
        price_data: {
          currency: PLATFORM_CURRENCY.toLowerCase(),
          product_data: { name: itemName },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      });
    }

    if (!this.stripeUAE) {
      throw new BadRequestException('Stripe is not configured for UAE gateway');
    }
    const paymentIds = insertedPayments.map((p) => p.paymentId);

    const separator = successUrl.includes('?') ? '&' : '?';
    const session = await this.stripeUAE.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${successUrl}${separator}paymentId=${paymentIds[0]}&bulk=true&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        paymentIds: JSON.stringify(paymentIds),
        userId: payload.userId,
        cartItemIds: JSON.stringify(payload.cartItemIds),
        bulk: 'true',
        couponCode: payload.couponCode || '',
      },
    });

    // Batch update all payments with session ID in a single query
    await this.db
      .update(payments)
      .set({ gatewayId: session.id })
      .where(inArray(payments.paymentId, paymentIds));

    return {
      paymentId: paymentIds[0],
      paymentIds,
      checkoutUrl: session.url,
      sessionId: session.id,
      clientReferenceId: session.client_reference_id,
    };
  }

  async verifyAndCompletePayment(paymentId: string, userId: string) {
    const payment = await this.db.query.payments.findFirst({
      where: and(
        eq(payments.paymentId, paymentId),
        eq(payments.userId, userId)
      ),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'COMPLETED') {
      return { success: true, message: 'Payment already processed' };
    }

    await this.markPaymentCompleted(paymentId);

    await this.grantAccessForPayment(
      paymentId,
      payment.itemType,
      userId,
      payment.courseId || undefined,
      payment.sectionId || undefined
    );

    const cartItemMetadata = payment.metadata as any;
    if (cartItemMetadata?.cartItemId) {
      await this.db
        .delete(cartItems)
        .where(eq(cartItems.cartItemId, cartItemMetadata.cartItemId));
    }

    return { success: true, message: 'Payment verified and access granted' };
  }

  async verifyAndCompleteBulkPayment(paymentIds: string[], userId: string) {
    if (!paymentIds || paymentIds.length === 0) {
      return { success: true, message: 'No payments to process', processedCount: 0 };
    }

    // Batch fetch all payments in a single query
    const allPayments = await this.db.query.payments.findMany({
      where: and(
        inArray(payments.paymentId, paymentIds),
        eq(payments.userId, userId)
      ),
    });

    if (allPayments.length === 0) {
      return { success: true, message: 'No payments found', processedCount: 0 };
    }

    // Filter payments that need processing (not already completed)
    const paymentsToComplete = allPayments.filter(p => p.status !== 'COMPLETED');
    const alreadyCompletedPayments = allPayments.filter(p => p.status === 'COMPLETED');

    // Batch mark pending payments as completed
    if (paymentsToComplete.length > 0) {
      await this.db
        .update(payments)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(inArray(payments.paymentId, paymentsToComplete.map(p => p.paymentId)));
    }

    // Grant access for all payments
    for (const payment of allPayments) {
      await this.grantAccessForPayment(
        payment.paymentId,
        payment.itemType,
        userId,
        payment.courseId || undefined,
        payment.sectionId || undefined
      );
    }

    // Collect cart item IDs to delete in batch
    const cartItemIdsToDelete: string[] = [];
    for (const payment of allPayments) {
      const cartItemMetadata = payment.metadata as any;
      if (cartItemMetadata?.cartItemId) {
        cartItemIdsToDelete.push(cartItemMetadata.cartItemId);
      }
    }

    // Batch delete cart items
    if (cartItemIdsToDelete.length > 0) {
      await this.db
        .delete(cartItems)
        .where(inArray(cartItems.cartItemId, cartItemIdsToDelete));
    }

    return {
      success: true,
      message: 'All payments verified and access granted',
      processedCount: allPayments.length,
      alreadyProcessed: alreadyCompletedPayments.length,
    };
  }

  async verifyAndCompletePaymentBySession(sessionId: string, userId: string) {
    // Require Stripe client for session-based verification
    if (!this.stripeUAE) {
      throw new BadRequestException(
        'Stripe is not configured. Cannot verify session-based payments.'
      );
    }

    // Find all payments associated with this session ID
    const sessionPayments = await this.db.query.payments.findMany({
      where: and(
        eq(payments.gatewayId, sessionId),
        eq(payments.userId, userId)
      ),
    });

    if (sessionPayments.length === 0) {
      throw new NotFoundException('No payments found for this session');
    }

    // Idempotency check: if all payments are already completed, return early
    const allCompleted = sessionPayments.every(p => p.status === 'COMPLETED');
    if (allCompleted) {
      return {
        success: true,
        message: 'Payments already processed',
        processedCount: sessionPayments.length,
        alreadyProcessed: true,
      };
    }

    // Verify with Stripe before proceeding
    const session = await this.stripeUAE.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Payment not completed');
    }

    // Batch update: mark as completed (do NOT overwrite gatewayId - it stores the session ID)
    const paymentIdsToUpdate = sessionPayments
      .filter(p => p.status !== 'COMPLETED')
      .map(p => p.paymentId);

    if (paymentIdsToUpdate.length > 0) {
      await this.db
        .update(payments)
        .set({
          status: 'COMPLETED',
          updatedAt: new Date(),
        })
        .where(inArray(payments.paymentId, paymentIdsToUpdate));
    }

    // Grant access for all payments
    for (const payment of sessionPayments) {
      await this.grantAccessForPayment(
        payment.paymentId,
        payment.itemType,
        userId,
        payment.courseId || undefined,
        payment.sectionId || undefined
      );
    }

    // Collect cart item IDs to delete in batch
    const cartItemIdsToDelete: string[] = [];
    for (const payment of sessionPayments) {
      const cartItemMetadata = payment.metadata as any;
      if (cartItemMetadata?.cartItemId) {
        cartItemIdsToDelete.push(cartItemMetadata.cartItemId);
      }
    }

    // Batch delete cart items
    if (cartItemIdsToDelete.length > 0) {
      await this.db
        .delete(cartItems)
        .where(inArray(cartItems.cartItemId, cartItemIdsToDelete));
    }

    return {
      success: true,
      message: 'Payment verified and access granted',
      processedCount: sessionPayments.length,
    };
  }

  async grantAccessForPayment(paymentId: string, itemType: 'COURSE' | 'SECTION', userId: string, courseId?: string, sectionId?: string) {
    if (itemType === 'COURSE' && courseId) {
      // Check for existing ACTIVE or COMPLETED enrollment
      const [existingActive] = await this.db
        .select({ id: enrollments.enrollmentId })
        .from(enrollments)
        .where(and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, userId),
          inArray(enrollments.status, ['ACTIVE', 'COMPLETED'])
        ))
        .limit(1);

      if (!existingActive) {
        // Check if there's a REVOKED enrollment to reactivate
        const [existingRevoked] = await this.db
          .select({ id: enrollments.enrollmentId })
          .from(enrollments)
          .where(and(
            eq(enrollments.courseId, courseId),
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'REVOKED')
          ))
          .limit(1);

        if (existingRevoked) {
          // Reactivate the revoked enrollment
          await this.db
            .update(enrollments)
            .set({ status: 'ACTIVE' })
            .where(eq(enrollments.enrollmentId, existingRevoked.id));
        } else {
          // Create new enrollment
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

  async getAllPayments(filters?: { search?: string; limit?: number; page?: number; status?: string; gateway?: string; dateFrom?: string; dateTo?: string }) {
    const limit = Math.min(filters?.limit || 100, MAX_PAGE_LIMIT);
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    // Build where clause for both data and count queries
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

    // Execute data query and count query in parallel
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

