import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, sql, isNull, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import {
  courseReviews,
  courseProgress,
  courses,
  users,
  enrollments,
} from '../database/schema';
import { FilesService } from '../files/files.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const MAX_PAGE_LIMIT = 100;

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly filesService: FilesService,
  ) {}

  private resolveThumbnail(thumbnail: string | null): string | null {
    if (!thumbnail) return null;
    if (thumbnail.startsWith('http')) return thumbnail;
    return this.filesService.getDownloadUrl(thumbnail);
  }

  async getMyReviews(userId: string, page: number, limit: number) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(limit, MAX_PAGE_LIMIT);
    const offset = (safePage - 1) * safeLimit;

    const whereClause = and(
      eq(courseReviews.userId, userId),
      eq(courseReviews.isDeleted, false),
    );

    const [results, countResult] = await Promise.all([
      this.db
        .select({
          reviewId: courseReviews.reviewId,
          courseId: courseReviews.courseId,
          courseTitle: courses.title,
          courseThumbnail: courses.thumbnail,
          rating: courseReviews.rating,
          title: courseReviews.title,
          body: courseReviews.body,
          status: courseReviews.status,
          instructorReply: courseReviews.instructorReply,
          createdAt: courseReviews.createdAt,
          updatedAt: courseReviews.updatedAt,
        })
        .from(courseReviews)
        .innerJoin(courses, eq(courseReviews.courseId, courses.courseId))
        .where(whereClause)
        .orderBy(desc(courseReviews.createdAt))
        .limit(safeLimit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseReviews)
        .where(whereClause),
    ]);

    const data = results.map((r) => ({
      ...r,
      courseThumbnail: this.resolveThumbnail(r.courseThumbnail),
    }));

    const total = Number(countResult[0]?.count ?? 0);
    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async createReview(userId: string, dto: CreateReviewDto) {
    const [enrollment] = await this.db
      .select({ enrollmentId: enrollments.enrollmentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, dto.courseId),
        ),
      )
      .limit(1);

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to leave a review.',
      );
    }

    const [existing] = await this.db
      .select({
        reviewId: courseReviews.reviewId,
        isDeleted: courseReviews.isDeleted,
      })
      .from(courseReviews)
      .where(
        and(
          eq(courseReviews.courseId, dto.courseId),
          eq(courseReviews.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      if (!existing.isDeleted) {
        throw new ConflictException('You have already reviewed this course.');
      }

      const [revived] = await this.db
        .update(courseReviews)
        .set({
          rating: dto.rating,
          title: dto.title ?? null,
          body: dto.body,
          status: 'PENDING',
          isDeleted: false,
          moderatedBy: null,
          moderatedAt: null,
          instructorReply: null,
          instructorRepliedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(courseReviews.reviewId, existing.reviewId))
        .returning();

      return revived;
    }

    const [review] = await this.db
      .insert(courseReviews)
      .values({
        courseId: dto.courseId,
        userId,
        rating: dto.rating,
        title: dto.title ?? null,
        body: dto.body,
        status: 'PENDING',
      })
      .returning();

    return review;
  }

  async updateReview(reviewId: string, userId: string, dto: UpdateReviewDto) {
    const [review] = await this.db
      .select({
        reviewId: courseReviews.reviewId,
        userId: courseReviews.userId,
        isDeleted: courseReviews.isDeleted,
      })
      .from(courseReviews)
      .where(eq(courseReviews.reviewId, reviewId))
      .limit(1);

    if (!review || review.isDeleted) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews.');
    }

    const updateFields: Partial<typeof courseReviews.$inferInsert> = {
      status: 'PENDING',
      updatedAt: new Date(),
    };

    if (dto.rating !== undefined) updateFields.rating = dto.rating;
    if (dto.title !== undefined) updateFields.title = dto.title;
    if (dto.body !== undefined) updateFields.body = dto.body;

    const [updated] = await this.db
      .update(courseReviews)
      .set(updateFields)
      .where(eq(courseReviews.reviewId, reviewId))
      .returning();

    return updated;
  }

  async deleteReview(reviewId: string, userId: string) {
    const [review] = await this.db
      .select({
        reviewId: courseReviews.reviewId,
        userId: courseReviews.userId,
        isDeleted: courseReviews.isDeleted,
      })
      .from(courseReviews)
      .where(eq(courseReviews.reviewId, reviewId))
      .limit(1);

    if (!review || review.isDeleted) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews.');
    }

    await this.db
      .update(courseReviews)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(courseReviews.reviewId, reviewId));

    return { reviewId, message: 'Review deleted.' };
  }

  async getReviewableCourses(userId: string) {
    const rows = await this.db
      .select({
        courseId: courses.courseId,
        title: courses.title,
        thumbnail: courses.thumbnail,
        progressPercent: sql<number>`COALESCE(${courseProgress.progress}::float, 0)`,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.courseId))
      .leftJoin(
        courseProgress,
        and(
          eq(courseProgress.courseId, enrollments.courseId),
          eq(courseProgress.userId, enrollments.userId),
        ),
      )
      .leftJoin(
        courseReviews,
        and(
          eq(courseReviews.courseId, enrollments.courseId),
          eq(courseReviews.userId, enrollments.userId),
          eq(courseReviews.isDeleted, false),
        ),
      )
      .where(
        and(
          eq(enrollments.userId, userId),
          inArray(enrollments.status, ['ACTIVE', 'COMPLETED']),
          isNull(courseReviews.reviewId),
        ),
      )
      .orderBy(desc(enrollments.enrolledAt));

    return rows.map((r) => ({
      courseId: r.courseId,
      title: r.title,
      thumbnail: this.resolveThumbnail(r.thumbnail) ?? '',
      progressPercent: Number(r.progressPercent),
    }));
  }

  async getPublicReviews(courseId: string, page: number, limit: number) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(limit, MAX_PAGE_LIMIT);
    const offset = (safePage - 1) * safeLimit;

    const whereClause = and(
      eq(courseReviews.courseId, courseId),
      eq(courseReviews.status, 'PUBLISHED'),
      eq(courseReviews.isDeleted, false),
    );

    const [results, countResult] = await Promise.all([
      this.db
        .select({
          reviewId: courseReviews.reviewId,
          courseId: courseReviews.courseId,
          rating: courseReviews.rating,
          title: courseReviews.title,
          body: courseReviews.body,
          instructorReply: courseReviews.instructorReply,
          instructorRepliedAt: courseReviews.instructorRepliedAt,
          createdAt: courseReviews.createdAt,
          updatedAt: courseReviews.updatedAt,
          reviewerFirstName: users.firstName,
          reviewerLastName: users.lastName,
        })
        .from(courseReviews)
        .innerJoin(users, eq(courseReviews.userId, users.userId))
        .where(whereClause)
        .orderBy(desc(courseReviews.createdAt))
        .limit(safeLimit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseReviews)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: results,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getAdminReviews(filters: {
    status?: 'PENDING' | 'PUBLISHED' | 'REJECTED';
    courseId?: string;
    page: number;
    limit: number;
  }) {
    const safePage = Math.max(filters.page, 1);
    const safeLimit = Math.min(filters.limit, MAX_PAGE_LIMIT);
    const offset = (safePage - 1) * safeLimit;

    const conditions = [eq(courseReviews.isDeleted, false)];

    if (filters.status) {
      conditions.push(eq(courseReviews.status, filters.status));
    }
    if (filters.courseId) {
      conditions.push(eq(courseReviews.courseId, filters.courseId));
    }

    const whereClause = and(...conditions);

    const [results, countResult] = await Promise.all([
      this.db
        .select({
          reviewId: courseReviews.reviewId,
          courseId: courseReviews.courseId,
          courseTitle: courses.title,
          userId: courseReviews.userId,
          reviewerFirstName: users.firstName,
          reviewerLastName: users.lastName,
          rating: courseReviews.rating,
          title: courseReviews.title,
          body: courseReviews.body,
          status: courseReviews.status,
          moderatedBy: courseReviews.moderatedBy,
          moderatedAt: courseReviews.moderatedAt,
          instructorReply: courseReviews.instructorReply,
          instructorRepliedAt: courseReviews.instructorRepliedAt,
          createdAt: courseReviews.createdAt,
          updatedAt: courseReviews.updatedAt,
        })
        .from(courseReviews)
        .innerJoin(courses, eq(courseReviews.courseId, courses.courseId))
        .innerJoin(users, eq(courseReviews.userId, users.userId))
        .where(whereClause)
        .orderBy(desc(courseReviews.createdAt))
        .limit(safeLimit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseReviews)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: results,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async moderateReview(
    reviewId: string,
    moderatorId: string,
    status: 'PUBLISHED' | 'REJECTED',
  ) {
    const [review] = await this.db
      .select({
        reviewId: courseReviews.reviewId,
        isDeleted: courseReviews.isDeleted,
      })
      .from(courseReviews)
      .where(eq(courseReviews.reviewId, reviewId))
      .limit(1);

    if (!review || review.isDeleted) {
      throw new NotFoundException('Review not found.');
    }

    const [updated] = await this.db
      .update(courseReviews)
      .set({
        status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(courseReviews.reviewId, reviewId))
      .returning();

    return updated;
  }

  async addInstructorReply(
    reviewId: string,
    instructorId: string,
    reply: string,
  ) {
    const [row] = await this.db
      .select({
        reviewId: courseReviews.reviewId,
        isDeleted: courseReviews.isDeleted,
        courseInstructorId: courses.instructorId,
      })
      .from(courseReviews)
      .innerJoin(courses, eq(courseReviews.courseId, courses.courseId))
      .where(eq(courseReviews.reviewId, reviewId))
      .limit(1);

    if (!row || row.isDeleted) {
      throw new NotFoundException('Review not found.');
    }

    if (row.courseInstructorId !== instructorId) {
      throw new ForbiddenException(
        'Only the course instructor may reply to reviews.',
      );
    }

    const [updated] = await this.db
      .update(courseReviews)
      .set({
        instructorReply: reply,
        instructorRepliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(courseReviews.reviewId, reviewId))
      .returning();

    return updated;
  }
}
