import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, desc, eq, inArray, sum } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export interface EarningsResult {
  /** Gross revenue from all COMPLETED payments (no commission model applied). */
  lifetimeGross: number;
  /** Number of completed course sales. */
  coursesSold: number;
  /** Amount actually disbursed (status = PAID). */
  totalPayout: number;
  /**
   * Available to withdraw = lifetimeGross - sum(PENDING + APPROVED + PAID requests).
   * PENDING requests reduce the available balance immediately so an instructor
   * cannot submit two overlapping withdrawal requests.
   *
   * [Q] Commission split undecided — gross amount is used for all calculations.
   *     When a rate is agreed, apply it to lifetimeGross here.
   */
  currentBalance: number;
}

@Injectable()
export class PayoutsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Instructor endpoints ──────────────────────────────────────────────────

  async getEarnings(instructorId: string): Promise<EarningsResult> {
    // 1. Lifetime gross: sum of COMPLETED payments for courses owned by this instructor
    const [earningsRow] = await this.db
      .select({ total: sum(schema.payments.amount) })
      .from(schema.payments)
      .innerJoin(
        schema.courses,
        eq(schema.payments.courseId, schema.courses.courseId),
      )
      .where(
        and(
          eq(schema.courses.instructorId, instructorId),
          eq(schema.payments.status, 'COMPLETED'),
        ),
      );

    // 2. Number of completed sales
    const [soldRow] = await this.db
      .select({ total: count() })
      .from(schema.payments)
      .innerJoin(
        schema.courses,
        eq(schema.payments.courseId, schema.courses.courseId),
      )
      .where(
        and(
          eq(schema.courses.instructorId, instructorId),
          eq(schema.payments.status, 'COMPLETED'),
        ),
      );

    // 3. Total claimed: PENDING + APPROVED + PAID payout requests all reduce
    //    the available balance to prevent double-withdrawal.
    const [claimedRow] = await this.db
      .select({ total: sum(schema.payoutRequests.amount) })
      .from(schema.payoutRequests)
      .where(
        and(
          eq(schema.payoutRequests.instructorId, instructorId),
          inArray(schema.payoutRequests.status, ['PENDING', 'APPROVED', 'PAID']),
        ),
      );

    // 4. Disbursed: only PAID requests count toward "Total Payout"
    const [disbursedRow] = await this.db
      .select({ total: sum(schema.payoutRequests.amount) })
      .from(schema.payoutRequests)
      .where(
        and(
          eq(schema.payoutRequests.instructorId, instructorId),
          eq(schema.payoutRequests.status, 'PAID'),
        ),
      );

    const lifetimeGross = parseFloat(earningsRow.total ?? '0');
    const totalClaimed = parseFloat(claimedRow.total ?? '0');
    const totalDisbursed = parseFloat(disbursedRow.total ?? '0');

    return {
      lifetimeGross,
      coursesSold: soldRow.total,
      totalPayout: totalDisbursed,
      currentBalance: Math.max(0, lifetimeGross - totalClaimed),
    };
  }

  async getPayoutHistory(instructorId: string, pagination: PaginationDto) {
    const page = pagination.page ?? DEFAULT_PAGE;
    const limit = pagination.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(schema.payoutRequests)
        .where(eq(schema.payoutRequests.instructorId, instructorId))
        .orderBy(desc(schema.payoutRequests.requestedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.payoutRequests)
        .where(eq(schema.payoutRequests.instructorId, instructorId)),
    ]);

    const totalCount = countRows[0]?.total ?? 0;

    return {
      data: rows,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async createPayout(instructorId: string, dto: CreatePayoutDto) {
    // Server-side balance check: never trust a client-supplied amount
    const { currentBalance } = await this.getEarnings(instructorId);

    if (dto.amount > currentBalance) {
      throw new BadRequestException(
        `Requested amount (${dto.amount.toFixed(2)}) exceeds available balance (${currentBalance.toFixed(2)}).`,
      );
    }

    const [payout] = await this.db
      .insert(schema.payoutRequests)
      .values({
        instructorId,
        amount: dto.amount.toFixed(2),
        currency: 'INR',
        method: dto.method,
        accountDetails: dto.accountDetails ?? null,
        status: 'PENDING',
      })
      .returning();

    return payout;
  }

  async cancelPayout(payoutId: string, instructorId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.payoutRequests)
      .where(eq(schema.payoutRequests.payoutId, payoutId));

    // 404 for both "not found" and "wrong owner" — do not reveal ownership to
    // other instructors via a 403.
    if (!existing || existing.instructorId !== instructorId) {
      throw new NotFoundException('Payout request not found.');
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Only PENDING requests can be cancelled. This request is ${existing.status}.`,
      );
    }

    await this.db
      .delete(schema.payoutRequests)
      .where(eq(schema.payoutRequests.payoutId, payoutId));

    return { deleted: true, payoutId };
  }

  async getSales(instructorId: string, pagination: PaginationDto) {
    // [Q] No commission model is defined yet.
    //     The "Your Commission" column is populated with the gross payment amount.
    //     When a commission rate is agreed, derive it from `payments.amount` here.
    const page = pagination.page ?? DEFAULT_PAGE;
    const limit = pagination.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          paymentId: schema.payments.paymentId,
          amount: schema.payments.amount,
          currency: schema.payments.currency,
          createdAt: schema.payments.createdAt,
          courseId: schema.courses.courseId,
          courseTitle: schema.courses.title,
          buyerFirstName: schema.users.firstName,
          buyerLastName: schema.users.lastName,
          buyerEmail: schema.users.email,
        })
        .from(schema.payments)
        .innerJoin(
          schema.courses,
          eq(schema.payments.courseId, schema.courses.courseId),
        )
        .innerJoin(
          schema.users,
          eq(schema.payments.userId, schema.users.userId),
        )
        .where(
          and(
            eq(schema.courses.instructorId, instructorId),
            eq(schema.payments.status, 'COMPLETED'),
          ),
        )
        .orderBy(desc(schema.payments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.payments)
        .innerJoin(
          schema.courses,
          eq(schema.payments.courseId, schema.courses.courseId),
        )
        .where(
          and(
            eq(schema.courses.instructorId, instructorId),
            eq(schema.payments.status, 'COMPLETED'),
          ),
        ),
    ]);

    const totalCount = countRows[0]?.total ?? 0;

    return {
      data: rows.map((r) => ({
        paymentId: r.paymentId,
        courseId: r.courseId,
        courseTitle: r.courseTitle,
        buyerName:
          [r.buyerFirstName, r.buyerLastName].filter(Boolean).join(' ') ||
          r.buyerEmail,
        buyerEmail: r.buyerEmail,
        mainPrice: parseFloat(r.amount),
        // [Q] Commission rate undecided — reporting gross as "your commission"
        yourCommission: parseFloat(r.amount),
        currency: r.currency,
        date: r.createdAt,
      })),
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────

  async adminGetAll(pagination: PaginationDto) {
    const page = pagination.page ?? DEFAULT_PAGE;
    const limit = pagination.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(schema.payoutRequests)
        .orderBy(desc(schema.payoutRequests.requestedAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.payoutRequests),
    ]);

    const totalCount = countRows[0]?.total ?? 0;

    return {
      data: rows,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async adminUpdateStatus(
    payoutId: string,
    adminId: string,
    dto: UpdatePayoutStatusDto,
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.payoutRequests)
      .where(eq(schema.payoutRequests.payoutId, payoutId));

    if (!existing) {
      throw new NotFoundException('Payout request not found.');
    }

    const [updated] = await this.db
      .update(schema.payoutRequests)
      .set({
        status: dto.status,
        adminNote: dto.adminNote ?? null,
        processedBy: adminId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.payoutRequests.payoutId, payoutId))
      .returning();

    return updated;
  }
}
