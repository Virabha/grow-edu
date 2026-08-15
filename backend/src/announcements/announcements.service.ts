import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SQL, and, count, desc, eq, ilike, sql } from 'drizzle-orm';
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

  // ── Response mapper (announcementId → id per ResourcePage contract) ───────

  /** Map a raw DB row to the ResourcePage response shape.
   *  The page declares idKey="id" so we expose the PK under that key. */
  private toResourceResponse(row: {
    announcementId: string;
    courseId: string;
    instructorId: string;
    title: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    courseTitle?: string | null;
    sentTo?: number | null;
  }) {
    return {
      id: row.announcementId,
      courseId: row.courseId,
      instructorId: row.instructorId,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      courseTitle: row.courseTitle ?? null,
      sentTo: row.sentTo ?? 0,
    };
  }

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

  // ── ResourcePage-shaped endpoints (GET /announcements, :id, POST, PATCH, DELETE) ─

  /** GET /announcements — instructor sees their own; admin sees all.
   *  announcementId is exposed as `id` for the ResourcePage idKey="id" contract.
   *  sentTo = active enrollment count for the announcement's course.
   */
  async listPage(
    caller: { userId: string; role: string },
    query: {
      page?: number;
      limit?: number;
      search?: string;
      courseId?: string;
    },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const isAdmin = caller.role === 'PLATFORM_ADMIN';

    const conditions: (SQL<unknown> | undefined)[] = [];
    if (!isAdmin) {
      conditions.push(eq(courses.instructorId, caller.userId));
    }
    if (query.search) {
      conditions.push(ilike(courseAnnouncements.title, `%${query.search}%`));
    }
    if (query.courseId) {
      conditions.push(eq(courseAnnouncements.courseId, query.courseId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sentToSubquery = sql<number>`(
      SELECT count(*)::int FROM enrollments e
      WHERE e.course_id = ${courseAnnouncements.courseId}
        AND e.status = 'ACTIVE'
    )`;

    const [rows, [{ total }]] = await Promise.all([
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
          sentTo: sentToSubquery,
        })
        .from(courseAnnouncements)
        .innerJoin(courses, eq(courseAnnouncements.courseId, courses.courseId))
        .where(where)
        .orderBy(desc(courseAnnouncements.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(courseAnnouncements)
        .innerJoin(courses, eq(courseAnnouncements.courseId, courses.courseId))
        .where(where),
    ]);

    return {
      data: rows.map((r) => this.toResourceResponse(r)),
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  /** GET /announcements/:id — instructor must be the author; admin sees all. */
  async findById(
    announcementId: string,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';

    const [row] = await this.db
      .select({
        announcementId: courseAnnouncements.announcementId,
        courseId: courseAnnouncements.courseId,
        instructorId: courseAnnouncements.instructorId,
        title: courseAnnouncements.title,
        body: courseAnnouncements.body,
        createdAt: courseAnnouncements.createdAt,
        updatedAt: courseAnnouncements.updatedAt,
        courseTitle: courses.title,
        sentTo: sql<number>`(
          SELECT count(*)::int FROM enrollments e
          WHERE e.course_id = ${courseAnnouncements.courseId}
            AND e.status = 'ACTIVE'
        )`,
      })
      .from(courseAnnouncements)
      .innerJoin(courses, eq(courseAnnouncements.courseId, courses.courseId))
      .where(eq(courseAnnouncements.announcementId, announcementId))
      .limit(1);

    if (!row || (!isAdmin && row.instructorId !== caller.userId)) {
      throw new NotFoundException('Announcement not found');
    }

    return this.toResourceResponse(row);
  }

  /** POST /announcements — courseId comes from the request body (ResourcePage flat POST). */
  async createFromResource(
    dto: CreateAnnouncementDto,
    caller: { userId: string; role: string },
  ) {
    if (!dto.courseId) {
      throw new BadRequestException('courseId is required');
    }
    return this.create(dto.courseId, { title: dto.title, body: dto.body }, caller);
  }
}
