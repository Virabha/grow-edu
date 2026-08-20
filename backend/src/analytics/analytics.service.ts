import { Injectable, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, sql, and, gte, lte, inArray } from 'drizzle-orm';
import {
  batchEnrollments,
  batchInstructors,
  batches,
  payments,
  users,
} from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';

type DateFilters = { startDate?: Date; endDate?: Date };
type TrendFilters = DateFilters & { period?: string; days?: number };

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private assertStaff(userRole: string, what: string) {
    if (userRole !== 'PLATFORM_ADMIN' && userRole !== 'INSTRUCTOR') {
      throw new ForbiddenException(`Only admins and instructors can view ${what}`);
    }
  }

  private assertAdmin(userRole: string, what: string) {
    if (userRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException(`Only platform admins can view ${what}`);
    }
  }

  private enrolledBetween(filters?: DateFilters) {
    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(batchEnrollments.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(batchEnrollments.createdAt, filters.endDate));
    }
    return conditions;
  }

  private async assignedBatchIds(instructorId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: batchInstructors.batchId })
      .from(batchInstructors)
      .where(eq(batchInstructors.instructorId, instructorId));
    return rows.map((r) => r.batchId);
  }

  async getEnrollmentStats(userRole: string, filters?: DateFilters) {
    this.assertStaff(userRole, 'enrollment stats');
    const conditions = this.enrolledBetween(filters);

    const bySource = await this.db
      .select({
        source: batchEnrollments.source,
        count: sql<number>`count(*)::int`,
      })
      .from(batchEnrollments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(batchEnrollments.source);

    const counts = new Map(bySource.map((r) => [r.source, Number(r.count)]));
    const corporate = counts.get('CORPORATE_SEAT') ?? 0;
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

    return { total, b2c: total - corporate, b2b: corporate };
  }

  async getRevenueStats(userRole: string, filters?: DateFilters) {
    this.assertAdmin(userRole, 'revenue stats');

    const conditions = [eq(payments.status, 'COMPLETED')];
    if (filters?.startDate) {
      conditions.push(gte(payments.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(payments.createdAt, filters.endDate));
    }

    const revenue = await this.db
      .select({
        total: sql<number>`sum(${payments.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(and(...conditions));

    return {
      total: Number(revenue[0]?.total || 0),
      transactions: Number(revenue[0]?.count || 0),
    };
  }

  async getBatchPerformance(
    batchId: string,
    instructorId: string,
    userRole: string,
  ) {
    this.assertStaff(userRole, 'batch performance');

    if (userRole === 'INSTRUCTOR') {
      const [assignment] = await this.db
        .select({ batchId: batchInstructors.batchId })
        .from(batchInstructors)
        .where(
          and(
            eq(batchInstructors.batchId, batchId),
            eq(batchInstructors.instructorId, instructorId),
          ),
        )
        .limit(1);
      if (!assignment) {
        throw new ForbiddenException('Batch not found or you do not have access');
      }
    }

    const [byStatus] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${batchEnrollments.status} = 'COMPLETED')::int`,
      })
      .from(batchEnrollments)
      .where(eq(batchEnrollments.batchId, batchId));

    const total = Number(byStatus?.total ?? 0);
    const completed = Number(byStatus?.completed ?? 0);

    return {
      enrollments: total,
      completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  async getPlatformStats(userRole: string) {
    this.assertAdmin(userRole, 'platform stats');

    const [totalUsers, totalBatches, totalEnrollments] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(users),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(batches)
        .where(
          and(
            eq(batches.isDeleted, false),
            inArray(batches.status, ['UPCOMING', 'ONGOING', 'COMPLETED']),
          ),
        ),
      this.db.select({ count: sql<number>`count(*)` }).from(batchEnrollments),
    ]);

    return {
      totalUsers: Number(totalUsers[0]?.count || 0),
      totalBatches: Number(totalBatches[0]?.count || 0),
      totalEnrollments: Number(totalEnrollments[0]?.count || 0),
    };
  }

  async getInstructorRevenueStats(
    userId: string,
    userRole: string,
    filters?: DateFilters,
  ) {
    this.assertStaff(userRole, 'revenue');

    const conditions = [eq(payments.status, 'COMPLETED')];

    if (userRole === 'INSTRUCTOR') {
      const batchIds = await this.assignedBatchIds(userId);
      if (batchIds.length === 0) return { total: 0, transactions: 0 };
      conditions.push(inArray(payments.batchId, batchIds));
    }

    if (filters?.startDate) {
      conditions.push(gte(payments.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(payments.createdAt, filters.endDate));
    }

    const revenue = await this.db
      .select({
        total: sql<number>`sum(${payments.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(and(...conditions));

    return {
      total: Number(revenue[0]?.total || 0),
      transactions: Number(revenue[0]?.count || 0),
    };
  }

  async getEnrollmentTrend(userRole: string, filters?: TrendFilters) {
    this.assertStaff(userRole, 'the enrollment trend');

    const { startDate, endDate } = this.trendWindow(filters);
    const dateFormat = this.bucket(
      'batch_enrollments.created_at',
      filters?.period,
    );

    const results = await this.db
      .select({
        period: sql<string>`${sql.raw(dateFormat)}`,
        count: sql<number>`count(*)::int`,
      })
      .from(batchEnrollments)
      .where(
        and(
          gte(batchEnrollments.createdAt, startDate),
          lte(batchEnrollments.createdAt, endDate),
        ),
      )
      .groupBy(sql`${sql.raw(dateFormat)}`)
      .orderBy(sql`${sql.raw(dateFormat)}`);

    return results.map((r) => ({
      date: r.period,
      value: Number(r.count || 0),
    }));
  }

  async getRevenueTrend(userRole: string, filters?: TrendFilters) {
    this.assertAdmin(userRole, 'the revenue trend');

    const { startDate, endDate } = this.trendWindow(filters);
    const dateFormat = this.bucket('payments.created_at', filters?.period);

    const results = await this.db
      .select({
        period: sql<string>`${sql.raw(dateFormat)}`,
        revenue: sql<number>`sum(${payments.amount})::float`,
        transactions: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'COMPLETED'),
          gte(payments.createdAt, startDate),
          lte(payments.createdAt, endDate),
        ),
      )
      .groupBy(sql`${sql.raw(dateFormat)}`)
      .orderBy(sql`${sql.raw(dateFormat)}`);

    return results.map((r) => ({
      date: r.period,
      revenue: Number(r.revenue || 0),
      transactions: Number(r.transactions || 0),
    }));
  }

  async getTopBatches(
    userRole: string,
    filters?: DateFilters & { limit?: number },
  ) {
    this.assertStaff(userRole, 'top batches');
    const limit = Math.min(filters?.limit || 10, 100);
    const conditions = this.enrolledBetween(filters);

    const results = await this.db
      .select({
        batchId: batchEnrollments.batchId,
        batchTitle: batches.title,
        enrollments: sql<number>`count(${batchEnrollments.enrollmentId})::int`,
      })
      .from(batchEnrollments)
      .leftJoin(batches, eq(batchEnrollments.batchId, batches.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(batchEnrollments.batchId, batches.title)
      .orderBy(sql`count(${batchEnrollments.enrollmentId}) desc`)
      .limit(limit);

    return results.map((r) => ({
      batchId: r.batchId,
      batchTitle: r.batchTitle || 'Unknown Batch',
      enrollments: Number(r.enrollments || 0),
    }));
  }

  private trendWindow(filters?: TrendFilters) {
    const days = Math.max(1, Math.min(365, filters?.days || 30));
    return {
      endDate: filters?.endDate || new Date(),
      startDate:
        filters?.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    };
  }

  private bucket(column: string, period?: string): string {
    const pattern =
      period === 'week' ? 'YYYY-WW' : period === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    return `to_char(${column}::timestamp, '${pattern}')`;
  }
}
