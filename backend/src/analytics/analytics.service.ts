import { Injectable, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, sql, and, gte, lte, inArray, isNull, isNotNull } from 'drizzle-orm';
import { enrollments, courses, payments, courseProgress, users } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getEnrollmentStats(userRole: string, filters?: { startDate?: Date; endDate?: Date }) {
    if (userRole !== 'PLATFORM_ADMIN' && userRole !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only admins and instructors can view enrollment stats');
    }

    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(enrollments.enrolledAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(enrollments.enrolledAt, filters.endDate));
    }

    const totalEnrollments = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const b2cEnrollments = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(
        and(
          // Was `eq(companyId, null)`, which compiles to `= NULL` and is never
          // true — so the B2C figure was always 0. SQL null needs IS NULL.
          isNull(enrollments.companyId),
          conditions.length > 0 ? and(...conditions) : undefined,
        ),
      );

    const b2bEnrollments = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(
        and(
          isNotNull(enrollments.companyId),
          conditions.length > 0 ? and(...conditions) : undefined,
        ),
      );

    return {
      total: Number(totalEnrollments[0]?.count || 0),
      b2c: Number(b2cEnrollments[0]?.count || 0),
      b2b: Number(b2bEnrollments[0]?.count || 0),
    };
  }

  async getRevenueStats(userRole: string, filters?: { startDate?: Date; endDate?: Date }) {
    if (userRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can view revenue stats');
    }

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

  async getCoursePerformance(courseId: string, instructorId: string, userRole: string) {
    if (userRole !== 'PLATFORM_ADMIN' && userRole !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only admins and instructors can view course performance');
    }

    // Verify course ownership if instructor
    if (userRole === 'INSTRUCTOR') {
      const [course] = await this.db
        .select()
        .from(courses)
        .where(and(eq(courses.courseId, courseId), eq(courses.instructorId, instructorId)))
        .limit(1);

      if (!course) {
        throw new ForbiddenException('Course not found or you do not have access');
      }
    }

    const enrollmentCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));

    const completedCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, 'COMPLETED')));

    const avgProgress = await this.db
      .select({ avg: sql<number>`avg(${courseProgress.progress})` })
      .from(courseProgress)
      .where(eq(courseProgress.courseId, courseId));

    return {
      enrollments: Number(enrollmentCount[0]?.count || 0),
      completed: Number(completedCount[0]?.count || 0),
      completionRate: Number(enrollmentCount[0]?.count || 0) > 0
        ? (Number(completedCount[0]?.count || 0) / Number(enrollmentCount[0]?.count || 0)) * 100
        : 0,
      averageProgress: Number(avgProgress[0]?.avg || 0),
    };
  }

  async getPlatformStats(userRole: string) {
    if (userRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can view platform stats');
    }

    const totalUsers = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const totalCourses = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(courses)
      .where(eq(courses.status, 'PUBLISHED'));

    const totalEnrollments = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments);

    return {
      totalUsers: Number(totalUsers[0]?.count || 0),
      totalCourses: Number(totalCourses[0]?.count || 0),
      totalEnrollments: Number(totalEnrollments[0]?.count || 0),
    };
  }

  async getInstructorRevenueStats(userId: string, userRole: string, filters?: { startDate?: Date; endDate?: Date }) {
    if (userRole !== 'PLATFORM_ADMIN' && userRole !== 'INSTRUCTOR') {
        throw new ForbiddenException('Unauthorized');
    }

    const conditions = [eq(payments.status, 'COMPLETED')];
    
    // Filter by instructor's courses if user is an instructor (admins see all revenue)
    if (userRole === 'INSTRUCTOR') {
      const instructorCourses = await this.db
        .select({ courseId: courses.courseId })
        .from(courses)
        .where(eq(courses.instructorId, userId));

      const courseIds = instructorCourses.map((c) => c.courseId);
      
      if (courseIds.length === 0) {
        return {
          total: 0,
          transactions: 0,
        };
      }

      conditions.push(inArray(payments.courseId, courseIds));
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

  async getEnrollmentTrend(userRole: string, filters?: { period?: string; days?: number; startDate?: Date; endDate?: Date }) {
    if (userRole !== 'PLATFORM_ADMIN' && userRole !== 'INSTRUCTOR') {
        throw new ForbiddenException('Unauthorized');
    }

    const period = filters?.period || 'day';
    const days = Math.max(1, Math.min(365, filters?.days || 30));
    const endDate = filters?.endDate || new Date();
    const startDate = filters?.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let dateFormat: string;
    switch (period) {
      case 'week':
        dateFormat = "to_char(enrollments.enrolled_at::timestamp, 'YYYY-WW')";
        break;
      case 'month':
        dateFormat = "to_char(enrollments.enrolled_at::timestamp, 'YYYY-MM')";
        break;
      default:
        dateFormat = "to_char(enrollments.enrolled_at::timestamp, 'YYYY-MM-DD')";
    }

    const conditions = [
      gte(enrollments.enrolledAt, startDate),
      lte(enrollments.enrolledAt, endDate),
    ];

    const results = await this.db
      .select({
        period: sql<string>`${sql.raw(dateFormat)}`,
        count: sql<number>`count(*)::int`,
      })
      .from(enrollments)
      .where(and(...conditions))
      .groupBy(sql`${sql.raw(dateFormat)}`)
      .orderBy(sql`${sql.raw(dateFormat)}`);

    return results.map((r) => ({
      date: r.period,
      value: Number(r.count || 0),
    }));
  }

  async getRevenueTrend(userRole: string, filters?: { period?: string; days?: number; startDate?: Date; endDate?: Date }) {
    if (userRole !== 'PLATFORM_ADMIN') {
        throw new ForbiddenException('Only platform admins can view revenue trend');
    }

    const period = filters?.period || 'day';
    const days = Math.max(1, Math.min(365, filters?.days || 30));
    const endDate = filters?.endDate || new Date();
    const startDate = filters?.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let dateFormat: string;
    switch (period) {
      case 'week':
        dateFormat = "to_char(payments.created_at::timestamp, 'YYYY-WW')";
        break;
      case 'month':
        dateFormat = "to_char(payments.created_at::timestamp, 'YYYY-MM')";
        break;
      default:
        dateFormat = "to_char(payments.created_at::timestamp, 'YYYY-MM-DD')";
    }

    const conditions = [
      eq(payments.status, 'COMPLETED'),
      gte(payments.createdAt, startDate),
      lte(payments.createdAt, endDate),
    ];

    const results = await this.db
      .select({
        period: sql<string>`${sql.raw(dateFormat)}`,
        revenue: sql<number>`sum(${payments.amount})::float`,
        transactions: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(and(...conditions))
      .groupBy(sql`${sql.raw(dateFormat)}`)
      .orderBy(sql`${sql.raw(dateFormat)}`);

    return results.map((r) => ({
      date: r.period,
      revenue: Number(r.revenue || 0),
      transactions: Number(r.transactions || 0),
    }));
  }

  async getTopCourses(userRole: string, filters?: { limit?: number; startDate?: Date; endDate?: Date }) {
    if (userRole !== 'PLATFORM_ADMIN' && userRole !== 'INSTRUCTOR') {
        throw new ForbiddenException('Unauthorized');
    }
    const limit = Math.min(filters?.limit || 10, 100);
    const conditions = [];

    if (filters?.startDate) {
      conditions.push(gte(enrollments.enrolledAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(enrollments.enrolledAt, filters.endDate));
    }

    const results = await this.db
      .select({
        courseId: enrollments.courseId,
        courseTitle: courses.title,
        enrollments: sql<number>`count(${enrollments.enrollmentId})::int`,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.courseId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(enrollments.courseId, courses.title)
      .orderBy(sql`count(${enrollments.enrollmentId}) desc`)
      .limit(limit);

    return results.map((r) => ({
      courseId: r.courseId,
      courseTitle: r.courseTitle || 'Unknown Course',
      enrollments: Number(r.enrollments || 0),
    }));
  }
}

