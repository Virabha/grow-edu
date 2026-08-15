import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  courseAnnouncements,
  courses,
  enrollments,
} from '../database/schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

type DbType = PostgresJsDatabase<typeof schema>;

const MAX_PAGE_LIMIT = 100;

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
  ) {}

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Loads course owned by instructorId. Returns null (never throws) so callers
   *  can respond with 404 without leaking whether the course exists at all. */
  private async loadCourseForInstructor(
    courseId: string,
    instructorId: string,
  ): Promise<{ courseId: string } | null> {
    const [course] = await this.db
      .select({ courseId: courses.courseId })
      .from(courses)
      .where(
        and(
          eq(courses.courseId, courseId),
          eq(courses.instructorId, instructorId),
        ),
      )
      .limit(1);
    return course ?? null;
  }

  private async assertCourseExists(courseId: string): Promise<void> {
    const [course] = await this.db
      .select({ courseId: courses.courseId })
      .from(courses)
      .where(eq(courses.courseId, courseId))
      .limit(1);
    if (!course) throw new NotFoundException('Course not found');
  }

  private async assertEnrolled(
    courseId: string,
    userId: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({ enrollmentId: enrollments.enrollmentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, userId),
          eq(enrollments.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!row) throw new ForbiddenException('Not enrolled in this course');
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /** POST /courses/:courseId/announcements */
  async create(
    courseId: string,
    dto: CreateAnnouncementDto,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    if (isAdmin) {
      await this.assertCourseExists(courseId);
    } else {
      const course = await this.loadCourseForInstructor(courseId, caller.userId);
      if (!course) throw new NotFoundException('Course not found');
    }
    const [created] = await this.db
      .insert(courseAnnouncements)
      .values({
        courseId,
        instructorId: caller.userId,
        title: dto.title,
        body: dto.body,
      })
      .returning();
    return created;
  }

  /** GET /courses/:courseId/announcements */
  async listByCourse(
    courseId: string,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    const isInstructor = caller.role === 'INSTRUCTOR';

    if (isAdmin) {
      await this.assertCourseExists(courseId);
    } else if (isInstructor) {
      // Instructor must own the course — return 404 if not
      const course = await this.loadCourseForInstructor(courseId, caller.userId);
      if (!course) throw new NotFoundException('Course not found');
    } else {
      // Student path: course must exist and caller must be enrolled
      await this.assertCourseExists(courseId);
      await this.assertEnrolled(courseId, caller.userId);
    }

    return this.db
      .select()
      .from(courseAnnouncements)
      .where(eq(courseAnnouncements.courseId, courseId))
      .orderBy(desc(courseAnnouncements.createdAt)); // uses course_announcements_course_created_idx
  }

  /** PATCH /announcements/:id — author or admin only; non-author gets 404 */
  async update(
    announcementId: string,
    dto: UpdateAnnouncementDto,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    const [existing] = await this.db
      .select()
      .from(courseAnnouncements)
      .where(eq(courseAnnouncements.announcementId, announcementId))
      .limit(1);
    if (!existing || (!isAdmin && existing.instructorId !== caller.userId)) {
      throw new NotFoundException('Announcement not found');
    }
    const [updated] = await this.db
      .update(courseAnnouncements)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        updatedAt: new Date(),
      })
      .where(eq(courseAnnouncements.announcementId, announcementId))
      .returning();
    return updated;
  }

  /** DELETE /announcements/:id — author or admin only; non-author gets 404 */
  async remove(
    announcementId: string,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    const [existing] = await this.db
      .select()
      .from(courseAnnouncements)
      .where(eq(courseAnnouncements.announcementId, announcementId))
      .limit(1);
    if (!existing || (!isAdmin && existing.instructorId !== caller.userId)) {
      throw new NotFoundException('Announcement not found');
    }
    await this.db
      .delete(courseAnnouncements)
      .where(eq(courseAnnouncements.announcementId, announcementId));
    return { success: true as const };
  }

  /** GET /announcements/mine — paginated, single JOIN, no N+1 */
  async listMine(
    caller: { userId: string; role: string },
    pagination: PaginationDto,
  ) {
    const page = pagination.page ?? 1;
    const limit = Math.min(pagination.limit ?? 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const isAdmin = caller.role === 'PLATFORM_ADMIN';

    // Admin sees all; instructor sees only their courses' announcements
    const ownerFilter = isAdmin
      ? undefined
      : eq(courses.instructorId, caller.userId);

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          announcementId: courseAnnouncements.announcementId,
          courseId: courseAnnouncements.courseId,
          instructorId: courseAnnouncements.instructorId,
          title: courseAnnouncements.title,
          body: courseAnnouncements.body,
          createdAt: courseAnnouncements.createdAt,
          updatedAt: courseAnnouncements.updatedAt,
          courseTitle: courses.title,
        })
        .from(courseAnnouncements)
        .innerJoin(courses, eq(courseAnnouncements.courseId, courses.courseId))
        .where(ownerFilter)
        .orderBy(desc(courseAnnouncements.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseAnnouncements)
        .innerJoin(courses, eq(courseAnnouncements.courseId, courses.courseId))
        .where(ownerFilter),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
