import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, sql, ilike, desc, asc, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import {
  coupons,
  couponCategories,
  couponCourses,
  couponUsages,
  courses,
  categories,
  courseSections,
} from '../database/schema';
import { CreateCouponDto, DiscountType } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

const MAX_PAGE_LIMIT = 50;

export type CouponUsageStatus = 'RESERVED' | 'CONSUMED' | 'CANCELLED';

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  couponCode: string;
  discountType?: string;
  discountValue?: string;
  originalAmount?: string;
  discountAmount?: string;
  finalAmount?: string;
  reason?: string;
  message: string;
}

@Injectable()
export class CouponsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private reservationTtlMs(): number {
    // Keep short to avoid holding global limits hostage if user abandons checkout
    return 30 * 60 * 1000; // 30 minutes
  }

  private now(): Date {
    return new Date();
  }

  private normalizeCode(code: string): string {
    return code.toUpperCase().trim();
  }

  private isUsageCountablePredicate(now: Date) {
    // Count CONSUMED always, count RESERVED only if not expired
    return sql`(
      ${couponUsages.status} = 'CONSUMED'
      OR (
        ${couponUsages.status} = 'RESERVED'
        AND ${couponUsages.reservedExpiresAt} IS NOT NULL
        AND ${couponUsages.reservedExpiresAt} > ${now}
      )
    )`;
  }

  // ==================== ADMIN METHODS ====================

  async create(dto: CreateCouponDto) {
    // Check for duplicate code (case-insensitive)
    const existing = await this.db
      .select({ id: coupons.couponId })
      .from(coupons)
      .where(
        and(
          sql`LOWER(${coupons.couponCode}) = LOWER(${dto.couponCode})`,
          eq(coupons.isDeleted, false),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Coupon code already exists');
    }

    // Validate date range
    const validFrom = new Date(dto.validFrom);
    const validTill = new Date(dto.validTill);
    if (validTill <= validFrom) {
      throw new BadRequestException('validTill must be after validFrom');
    }

    // Validate percentage discount
    if (dto.discountType === DiscountType.PERCENTAGE && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    // Create coupon
    const [coupon] = await this.db
      .insert(coupons)
      .values({
        couponCode: dto.couponCode.toUpperCase(),
        discountType: dto.discountType,
        discountValue: String(dto.discountValue),
        maxDiscountAmount: dto.maxDiscountAmount
          ? String(dto.maxDiscountAmount)
          : null,
        minPurchaseAmount: dto.minPurchaseAmount
          ? String(dto.minPurchaseAmount)
          : null,
        validFrom,
        validTill,
        usageLimit: dto.usageLimit ?? null,
        usageLimitPerUser: dto.usageLimitPerUser ?? 1,
        isActive: dto.isActive ?? true,
      })
      .returning();

    // Add category associations
    if (dto.categoryIds?.length) {
      await this.db.insert(couponCategories).values(
        dto.categoryIds.map((categoryId) => ({
          couponId: coupon.couponId,
          categoryId,
        })),
      );
    }

    // Add course associations
    if (dto.courseIds?.length) {
      await this.db.insert(couponCourses).values(
        dto.courseIds.map((courseId) => ({
          couponId: coupon.couponId,
          courseId,
        })),
      );
    }

    return this.findOne(coupon.couponId);
  }

  async findAll(filters?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const limit = Math.min(filters?.limit || 20, MAX_PAGE_LIMIT);
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    const conditions = [eq(coupons.isDeleted, false)];

    if (filters?.search) {
      conditions.push(ilike(coupons.couponCode, `%${filters.search}%`));
    }

    if (typeof filters?.isActive === 'boolean') {
      conditions.push(eq(coupons.isActive, filters.isActive));
    }

    const whereClause = and(...conditions);

    // Get coupons with usage count via subquery
    const [results, countResult] = await Promise.all([
      this.db
        .select({
          couponId: coupons.couponId,
          couponCode: coupons.couponCode,
          discountType: coupons.discountType,
          discountValue: coupons.discountValue,
          maxDiscountAmount: coupons.maxDiscountAmount,
          minPurchaseAmount: coupons.minPurchaseAmount,
          validFrom: coupons.validFrom,
          validTill: coupons.validTill,
          usageLimit: coupons.usageLimit,
          usageLimitPerUser: coupons.usageLimitPerUser,
          isActive: coupons.isActive,
          createdAt: coupons.createdAt,
          usageCount: sql<number>`(
            SELECT COUNT(*)::int FROM coupon_usages
            WHERE coupon_usages.coupon_id = ${coupons.couponId}
          )`,
        })
        .from(coupons)
        .where(whereClause)
        .orderBy(desc(coupons.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(whereClause),
    ]);

    // Fetch associated categories and courses for each coupon
    const couponIds = results.map((r) => r.couponId);

    const [categoryAssocs, courseAssocs] = await Promise.all([
      couponIds.length > 0
        ? this.db
            .select({
              couponId: couponCategories.couponId,
              categoryId: categories.categoryId,
              name: categories.name,
            })
            .from(couponCategories)
            .innerJoin(
              categories,
              eq(couponCategories.categoryId, categories.categoryId),
            )
            .where(inArray(couponCategories.couponId, couponIds))
        : [],
      couponIds.length > 0
        ? this.db
            .select({
              couponId: couponCourses.couponId,
              courseId: courses.courseId,
              title: courses.title,
            })
            .from(couponCourses)
            .innerJoin(courses, eq(couponCourses.courseId, courses.courseId))
            .where(inArray(couponCourses.couponId, couponIds))
        : [],
    ]);

    const data = results.map((coupon) => ({
      ...coupon,
      categories: categoryAssocs
        .filter((ca) => ca.couponId === coupon.couponId)
        .map(({ categoryId, name }) => ({ categoryId, name })),
      courses: courseAssocs
        .filter((cc) => cc.couponId === coupon.couponId)
        .map(({ courseId, title }) => ({ courseId, title })),
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
        totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limit),
      },
    };
  }

  async findOne(couponId: string) {
    const [coupon] = await this.db
      .select({
        couponId: coupons.couponId,
        couponCode: coupons.couponCode,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        maxDiscountAmount: coupons.maxDiscountAmount,
        minPurchaseAmount: coupons.minPurchaseAmount,
        validFrom: coupons.validFrom,
        validTill: coupons.validTill,
        usageLimit: coupons.usageLimit,
        usageLimitPerUser: coupons.usageLimitPerUser,
        isActive: coupons.isActive,
        isDeleted: coupons.isDeleted,
        createdAt: coupons.createdAt,
        updatedAt: coupons.updatedAt,
        usageCount: sql<number>`(
          SELECT COUNT(*)::int FROM coupon_usages
          WHERE coupon_usages.coupon_id = ${coupons.couponId}
        )`,
      })
      .from(coupons)
      .where(eq(coupons.couponId, couponId))
      .limit(1);

    if (!coupon || coupon.isDeleted) {
      throw new NotFoundException('Coupon not found');
    }

    const [categoryAssocs, courseAssocs] = await Promise.all([
      this.db
        .select({
          categoryId: categories.categoryId,
          name: categories.name,
          slug: categories.slug,
        })
        .from(couponCategories)
        .innerJoin(
          categories,
          eq(couponCategories.categoryId, categories.categoryId),
        )
        .where(eq(couponCategories.couponId, couponId)),
      this.db
        .select({
          courseId: courses.courseId,
          title: courses.title,
        })
        .from(couponCourses)
        .innerJoin(courses, eq(couponCourses.courseId, courses.courseId))
        .where(eq(couponCourses.couponId, couponId)),
    ]);

    return {
      ...coupon,
      categories: categoryAssocs,
      courses: courseAssocs,
    };
  }

  async update(couponId: string, dto: UpdateCouponDto) {
    const existing = await this.findOne(couponId);

    // If updating coupon code, check for duplicates
    if (dto.couponCode && dto.couponCode.toUpperCase() !== existing.couponCode) {
      const duplicate = await this.db
        .select({ id: coupons.couponId })
        .from(coupons)
        .where(
          and(
            sql`LOWER(${coupons.couponCode}) = LOWER(${dto.couponCode})`,
            eq(coupons.isDeleted, false),
          ),
        )
        .limit(1);

      if (duplicate.length > 0) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    // Validate percentage discount
    if (dto.discountType === DiscountType.PERCENTAGE && dto.discountValue && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    // Build update object
    const updateData: Partial<typeof coupons.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.couponCode) updateData.couponCode = dto.couponCode.toUpperCase();
    if (dto.discountType) updateData.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      updateData.discountValue = String(dto.discountValue);
    if (dto.maxDiscountAmount !== undefined)
      updateData.maxDiscountAmount = dto.maxDiscountAmount
        ? String(dto.maxDiscountAmount)
        : null;
    if (dto.minPurchaseAmount !== undefined)
      updateData.minPurchaseAmount = dto.minPurchaseAmount
        ? String(dto.minPurchaseAmount)
        : null;
    if (dto.validFrom) updateData.validFrom = new Date(dto.validFrom);
    if (dto.validTill) updateData.validTill = new Date(dto.validTill);
    if (dto.usageLimit !== undefined) updateData.usageLimit = dto.usageLimit;
    if (dto.usageLimitPerUser !== undefined)
      updateData.usageLimitPerUser = dto.usageLimitPerUser;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    await this.db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.couponId, couponId));

    // Update category associations if provided
    if (dto.categoryIds !== undefined) {
      await this.db
        .delete(couponCategories)
        .where(eq(couponCategories.couponId, couponId));
      if (dto.categoryIds.length > 0) {
        await this.db.insert(couponCategories).values(
          dto.categoryIds.map((categoryId) => ({ couponId, categoryId })),
        );
      }
    }

    // Update course associations if provided
    if (dto.courseIds !== undefined) {
      await this.db
        .delete(couponCourses)
        .where(eq(couponCourses.couponId, couponId));
      if (dto.courseIds.length > 0) {
        await this.db.insert(couponCourses).values(
          dto.courseIds.map((courseId) => ({ couponId, courseId })),
        );
      }
    }

    return this.findOne(couponId);
  }

  async activate(couponId: string) {
    await this.findOne(couponId); // Throws if not found
    await this.db
      .update(coupons)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(coupons.couponId, couponId));
    return { couponId, isActive: true, message: 'Coupon activated' };
  }

  async deactivate(couponId: string) {
    await this.findOne(couponId);
    await this.db
      .update(coupons)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(coupons.couponId, couponId));
    return { couponId, isActive: false, message: 'Coupon deactivated' };
  }

  async softDelete(couponId: string) {
    await this.findOne(couponId);
    await this.db
      .update(coupons)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(eq(coupons.couponId, couponId));
    return { couponId, isDeleted: true, message: 'Coupon deleted' };
  }

  // ==================== VALIDATION METHODS ====================

  async validateCoupon(
    dto: ValidateCouponDto,
    userId: string,
  ): Promise<CouponValidationResult> {
    const code = this.normalizeCode(dto.couponCode);

    // Find coupon
    const [coupon] = await this.db
      .select()
      .from(coupons)
      .where(
        and(
          sql`LOWER(${coupons.couponCode}) = LOWER(${code})`,
          eq(coupons.isDeleted, false),
        ),
      )
      .limit(1);

    if (!coupon) {
      return {
        valid: false,
        couponCode: code,
        reason: 'NOT_FOUND',
        message: 'Coupon not found',
      };
    }

    // Check active
    if (!coupon.isActive) {
      return {
        valid: false,
        couponCode: code,
        reason: 'INACTIVE',
        message: 'This coupon is not active',
      };
    }

    // Check date range
    const now = new Date();
    if (now < coupon.validFrom) {
      return {
        valid: false,
        couponCode: code,
        reason: 'NOT_YET_VALID',
        message: 'This coupon is not yet valid',
      };
    }
    if (now > coupon.validTill) {
      return {
        valid: false,
        couponCode: code,
        reason: 'EXPIRED',
        message: 'This coupon has expired',
      };
    }

    // Check global usage limit
    if (coupon.usageLimit !== null) {
      const now2 = this.now();
      const countable = this.isUsageCountablePredicate(now2);
      const [globalUsage] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(couponUsages)
        .where(and(eq(couponUsages.couponId, coupon.couponId), countable));

      if (Number(globalUsage?.count || 0) >= coupon.usageLimit) {
        return {
          valid: false,
          couponCode: code,
          reason: 'USAGE_LIMIT_EXCEEDED',
          message: 'This coupon has reached its usage limit',
        };
      }
    }

    // Check per-user usage limit
    if (coupon.usageLimitPerUser !== null) {
      const now2 = this.now();
      const countable = this.isUsageCountablePredicate(now2);
      const [userUsage] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(couponUsages)
        .where(
          and(
            eq(couponUsages.couponId, coupon.couponId),
            eq(couponUsages.userId, userId),
            countable,
          ),
        );

      if (Number(userUsage?.count || 0) >= coupon.usageLimitPerUser) {
        return {
          valid: false,
          couponCode: code,
          reason: 'USER_LIMIT_EXCEEDED',
          message: 'You have already used this coupon',
        };
      }
    }

    // Fetch course details
    const [course] = await this.db
      .select({
        courseId: courses.courseId,
        categoryId: courses.categoryId,
        price: courses.price,
        currency: courses.currency,
      })
      .from(courses)
      .where(eq(courses.courseId, dto.courseId))
      .limit(1);

    if (!course) {
      return {
        valid: false,
        couponCode: code,
        reason: 'NOT_APPLICABLE',
        message: 'Course not found',
      };
    }

    // Calculate amount based on item type
    let originalAmount = Number(course.price);
    if (dto.itemType === 'SECTION' && dto.sectionId) {
      const [section] = await this.db
        .select({ sectionPrice: courseSections.sectionPrice })
        .from(courseSections)
        .where(eq(courseSections.sectionId, dto.sectionId))
        .limit(1);

      if (section?.sectionPrice) {
        originalAmount = Number(section.sectionPrice);
      }
    }

    // No couponing on free/zero priced items (prevents turning 0 into 0.01)
    if (originalAmount <= 0) {
      return {
        valid: false,
        couponCode: code,
        reason: 'NOT_APPLICABLE',
        message: 'Coupon cannot be applied to a free item',
      };
    }

    // Check minimum purchase amount
    if (
      coupon.minPurchaseAmount &&
      originalAmount < Number(coupon.minPurchaseAmount)
    ) {
      return {
        valid: false,
        couponCode: code,
        reason: 'MIN_AMOUNT_NOT_MET',
        message: `Minimum purchase amount is ${course.currency} ${coupon.minPurchaseAmount}`,
      };
    }

    // Check applicability (categories/courses)
    const [categoryAssocs, courseAssocs] = await Promise.all([
      this.db
        .select()
        .from(couponCategories)
        .where(eq(couponCategories.couponId, coupon.couponId)),
      this.db
        .select()
        .from(couponCourses)
        .where(eq(couponCourses.couponId, coupon.couponId)),
    ]);

    const hasRestrictions = categoryAssocs.length > 0 || courseAssocs.length > 0;

    if (hasRestrictions) {
      const courseApplicable = courseAssocs.some(
        (ca) => ca.courseId === dto.courseId,
      );
      const categoryApplicable = categoryAssocs.some(
        (ca) => ca.categoryId === course.categoryId,
      );

      if (!courseApplicable && !categoryApplicable) {
        return {
          valid: false,
          couponCode: code,
          reason: 'NOT_APPLICABLE',
          message: 'This coupon is not valid for this course',
        };
      }
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = originalAmount * (Number(coupon.discountValue) / 100);
      // Apply max discount cap
      if (
        coupon.maxDiscountAmount &&
        discountAmount > Number(coupon.maxDiscountAmount)
      ) {
        discountAmount = Number(coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    // Ensure discount doesn't exceed original amount and final is not negative
    discountAmount = Math.min(discountAmount, originalAmount);
    const finalAmount = Math.max(originalAmount - discountAmount, 0.01); // Never allow $0 or negative

    return {
      valid: true,
      couponId: coupon.couponId,
      couponCode: code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalAmount: originalAmount.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      finalAmount: finalAmount.toFixed(2),
      message: 'Coupon applied successfully',
    };
  }

  /**
   * ATOMIC coupon usage reservation - called at checkout-session creation.
   * Uses row-level lock on coupon row to serialize reservations per coupon,
   * preventing race conditions for global/per-user usage limits.
   */
  async reserveUsageForPayment(params: {
    couponId: string;
    userId: string;
    courseId?: string | null;
    paymentId: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
  }) {
    const now = this.now();
    const reservedExpiresAt = new Date(now.getTime() + this.reservationTtlMs());

    return this.db.transaction(async (tx) => {
      // Serialize reservations per coupon to avoid races
      await tx.execute(
        sql`SELECT ${coupons.couponId} FROM ${coupons} WHERE ${coupons.couponId} = ${params.couponId} FOR UPDATE`,
      );

      const [coupon] = await tx
        .select()
        .from(coupons)
        .where(eq(coupons.couponId, params.couponId))
        .limit(1);

      if (!coupon || coupon.isDeleted || !coupon.isActive) {
        throw new BadRequestException('Coupon is no longer valid');
      }

      if (now < coupon.validFrom || now > coupon.validTill) {
        throw new BadRequestException('Coupon is not valid at this time');
      }

      // Re-check limits *inside lock*
      const countable = this.isUsageCountablePredicate(now);

      if (coupon.usageLimit !== null) {
        const [globalUsage] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(couponUsages)
          .where(and(eq(couponUsages.couponId, params.couponId), countable));

        if (Number(globalUsage?.count || 0) >= coupon.usageLimit) {
          throw new BadRequestException('This coupon has reached its usage limit');
        }
      }

      if (coupon.usageLimitPerUser !== null) {
        const [userUsage] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(couponUsages)
          .where(
            and(
              eq(couponUsages.couponId, params.couponId),
              eq(couponUsages.userId, params.userId),
              countable,
            ),
          );

        if (Number(userUsage?.count || 0) >= coupon.usageLimitPerUser) {
          throw new BadRequestException('You have already used this coupon');
        }
      }

      const [usage] = await tx
        .insert(couponUsages)
        .values({
          couponId: params.couponId,
          userId: params.userId,
          courseId: params.courseId ?? null,
          paymentId: params.paymentId,
          status: 'RESERVED' as CouponUsageStatus,
          reservedExpiresAt,
          discountApplied: String(params.discountAmount),
          originalAmount: String(params.originalAmount),
          finalAmount: String(params.finalAmount),
        })
        .returning();

      return usage;
    });
  }

  async consumeReservationByPayment(paymentId: string) {
    const now = this.now();
    const [updated] = await this.db
      .update(couponUsages)
      .set({
        status: 'CONSUMED' as CouponUsageStatus,
        consumedAt: now,
      })
      .where(
        and(
          eq(couponUsages.paymentId, paymentId),
          eq(couponUsages.status, 'RESERVED' as CouponUsageStatus),
        ),
      )
      .returning();

    return updated || null;
  }

  async cancelReservationByPayment(paymentId: string) {
    const now = this.now();
    const [updated] = await this.db
      .update(couponUsages)
      .set({
        status: 'CANCELLED' as CouponUsageStatus,
        cancelledAt: now,
      })
      .where(
        and(
          eq(couponUsages.paymentId, paymentId),
          eq(couponUsages.status, 'RESERVED' as CouponUsageStatus),
        ),
      )
      .returning();

    return updated || null;
  }

  /**
   * Backward-compatible fallback: insert a CONSUMED usage row
   * if a legacy payment applied a coupon without a reservation row.
   */
  async recordConsumedUsageLegacy(params: {
    couponId: string;
    userId: string;
    courseId: string;
    paymentId: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
  }) {
    const now = this.now();
    const [usage] = await this.db
      .insert(couponUsages)
      .values({
        couponId: params.couponId,
        userId: params.userId,
        courseId: params.courseId,
        paymentId: params.paymentId,
        status: 'CONSUMED' as CouponUsageStatus,
        consumedAt: now,
        discountApplied: String(params.discountAmount),
        originalAmount: String(params.originalAmount),
        finalAmount: String(params.finalAmount),
      })
      .returning();
    return usage;
  }
}
