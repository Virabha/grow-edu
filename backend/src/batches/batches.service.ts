import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  batches,
  batchSubjects,
  batchEnrollments,
  batchSessions,
  batchAnnouncements,
  users,
} from "../database/schema";
import { FilesService } from "../files/files.service";
import { CdnService } from "../cdn/cdn.service";
import { CacheService } from "../cache/cache.service";
import { EmailService } from "../email/email.service";
import { CreateBatchDto } from "./dto/create-batch.dto";
import { UpdateBatchDto } from "./dto/update-batch.dto";
import { FilterBatchesDto } from "./dto/filter-batches.dto";
import {
  CreateBatchSubjectDto,
  UpdateBatchSubjectDto,
} from "./dto/batch-subject.dto";
import {
  CreateBatchSessionDto,
  UpdateBatchSessionDto,
} from "./dto/batch-session.dto";
import { CreateBatchEnrollmentsDto } from "./dto/batch-enrollment.dto";
import {
  CreateBatchAnnouncementDto,
  UpdateBatchAnnouncementDto,
} from "./dto/batch-announcement.dto";

const MAX_PAGE_LIMIT = 50;
const CACHE_PREFIX = "batches:";
const PUBLIC_LIST_TTL = 300;

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class BatchesService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    private readonly filesService: FilesService,
    private readonly cdnService: CdnService,
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private resolveImageUrl(key: string | null): string | null {
    if (!key) return null;
    if (key.startsWith("http")) return key;
    return this.filesService.getDownloadUrl(key);
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheService.delByPrefix(CACHE_PREFIX);
  }

  private async getBatchOrThrow(batchId: string) {
    const [batch] = await this.db
      .select()
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    if (!batch) throw new NotFoundException("Batch not found");
    return batch;
  }

  private async assertEnrolled(batchId: string, userId: string): Promise<void> {
    const [row] = await this.db
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE")
        )
      )
      .limit(1);
    if (!row) throw new ForbiddenException("Not enrolled in this batch");
    if (row.accessEndsAt && row.accessEndsAt < new Date()) {
      throw new ForbiddenException("Batch access has expired");
    }
  }

  private isAdmin(role?: string): boolean {
    return role === "PLATFORM_ADMIN";
  }

  // ─── Batches CRUD ──────────────────────────────────────────────────────────

  async findAll(filters: FilterBatchesDto, userRole?: string) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const isPublic = !this.isAdmin(userRole);
    const cacheKey = `${CACHE_PREFIX}list:${isPublic ? "public" : "admin"}:${JSON.stringify(filters)}`;
    if (isPublic) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const conditions = [eq(batches.isDeleted, false)];
    if (filters.targetExam) conditions.push(eq(batches.targetExam, filters.targetExam));
    if (filters.categoryId) conditions.push(eq(batches.categoryId, filters.categoryId));
    if (filters.status) {
      conditions.push(eq(batches.status, filters.status));
    } else if (isPublic) {
      conditions.push(inArray(batches.status, ["UPCOMING", "ONGOING"]));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(batches.title, pattern),
          ilike(batches.shortDescription, pattern),
          ilike(batches.targetExam, pattern)
        )!
      );
    }

    const where = and(...conditions);

    const [rows, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(batches)
        .where(where)
        .orderBy(desc(batches.startDate))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(batches)
        .where(where),
    ]);

    const data = rows.map((b) => ({
      ...b,
      thumbnail: this.resolveImageUrl(b.thumbnail),
      bannerImage: this.resolveImageUrl(b.bannerImage),
      price: Number(b.price),
      compareAtPrice: b.compareAtPrice == null ? null : Number(b.compareAtPrice),
    }));

    const response = {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };

    if (isPublic) {
      await this.cacheService.set(cacheKey, response, PUBLIC_LIST_TTL);
    }

    return response;
  }

  async findMine(userId: string) {
    const rows = await this.db
      .select({
        batch: batches,
        enrollment: batchEnrollments,
      })
      .from(batchEnrollments)
      .innerJoin(batches, eq(batchEnrollments.batchId, batches.batchId))
      .where(
        and(
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
          eq(batches.isDeleted, false)
        )
      )
      .orderBy(desc(batches.startDate));

    return rows.map((r) => ({
      ...r.batch,
      thumbnail: this.resolveImageUrl(r.batch.thumbnail),
      bannerImage: this.resolveImageUrl(r.batch.bannerImage),
      price: Number(r.batch.price),
      compareAtPrice:
        r.batch.compareAtPrice == null ? null : Number(r.batch.compareAtPrice),
      enrollment: {
        enrollmentId: r.enrollment.enrollmentId,
        status: r.enrollment.status,
        accessStartsAt: r.enrollment.accessStartsAt,
        accessEndsAt: r.enrollment.accessEndsAt,
      },
    }));
  }

  async findOne(idOrSlug: string, userId?: string, userRole?: string) {
    const [batch] = await this.db
      .select()
      .from(batches)
      .where(
        and(
          or(eq(batches.batchId, idOrSlug), eq(batches.slug, idOrSlug))!,
          eq(batches.isDeleted, false)
        )
      )
      .limit(1);

    if (!batch) throw new NotFoundException("Batch not found");

    const isAdmin = this.isAdmin(userRole);

    let isEnrolled = false;
    if (userId) {
      const [e] = await this.db
        .select()
        .from(batchEnrollments)
        .where(
          and(
            eq(batchEnrollments.batchId, batch.batchId),
            eq(batchEnrollments.userId, userId),
            eq(batchEnrollments.status, "ACTIVE")
          )
        )
        .limit(1);
      isEnrolled = !!e;
    }

    const subjects = await this.db
      .select()
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.batchId, batch.batchId),
          eq(batchSubjects.isDeleted, false)
        )
      )
      .orderBy(asc(batchSubjects.displayOrder), asc(batchSubjects.name));

    const teacherProfiles =
      Array.isArray(batch.teacherIds) && batch.teacherIds.length > 0
        ? await this.db
            .select({
              userId: users.userId,
              firstName: users.firstName,
              lastName: users.lastName,
              profileImage: users.profileImage,
              email: users.email,
            })
            .from(users)
            .where(inArray(users.userId, batch.teacherIds as string[]))
        : [];

    return {
      ...batch,
      thumbnail: this.resolveImageUrl(batch.thumbnail),
      bannerImage: this.resolveImageUrl(batch.bannerImage),
      price: Number(batch.price),
      compareAtPrice:
        batch.compareAtPrice == null ? null : Number(batch.compareAtPrice),
      subjects,
      teachers: teacherProfiles.map((t) => ({
        ...t,
        profileImage: this.resolveImageUrl(t.profileImage),
      })),
      isEnrolled,
      canManage: isAdmin,
    };
  }

  async create(dto: CreateBatchDto, createdBy: string) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException("endDate must be after startDate");
    }
    const [existing] = await this.db
      .select({ batchId: batches.batchId })
      .from(batches)
      .where(eq(batches.slug, dto.slug))
      .limit(1);
    if (existing) throw new BadRequestException("Slug already in use");

    const [created] = await this.db
      .insert(batches)
      .values({
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        targetExam: dto.targetExam,
        language: dto.language ?? "English",
        thumbnail: dto.thumbnail,
        bannerImage: dto.bannerImage,
        price: dto.price.toString(),
        compareAtPrice:
          dto.compareAtPrice != null ? dto.compareAtPrice.toString() : undefined,
        currency: dto.currency ?? "INR",
        capacity: dto.capacity,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        teacherIds: dto.teacherIds ?? [],
        categoryId: dto.categoryId,
        status: dto.status ?? "DRAFT",
        createdBy,
        publishedAt:
          dto.status === "UPCOMING" || dto.status === "ONGOING"
            ? new Date()
            : undefined,
      })
      .returning();

    await this.invalidateCache();
    return created;
  }

  async update(batchId: string, dto: UpdateBatchDto) {
    await this.getBatchOrThrow(batchId);
    if (dto.startDate && dto.endDate && new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException("endDate must be after startDate");
    }
    if (dto.slug) {
      const [conflict] = await this.db
        .select({ batchId: batches.batchId })
        .from(batches)
        .where(and(eq(batches.slug, dto.slug), sql`${batches.batchId} <> ${batchId}`))
        .limit(1);
      if (conflict) throw new BadRequestException("Slug already in use");
    }

    const [updated] = await this.db
      .update(batches)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.shortDescription !== undefined && {
          shortDescription: dto.shortDescription,
        }),
        ...(dto.targetExam !== undefined && { targetExam: dto.targetExam }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
        ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage }),
        ...(dto.price !== undefined && { price: dto.price.toString() }),
        ...(dto.compareAtPrice !== undefined && {
          compareAtPrice:
            dto.compareAtPrice === null ? null : dto.compareAtPrice.toString(),
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.teacherIds !== undefined && { teacherIds: dto.teacherIds }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.status !== undefined && {
          status: dto.status,
          ...(dto.status === "UPCOMING" || dto.status === "ONGOING"
            ? { publishedAt: new Date() }
            : {}),
        }),
        updatedAt: new Date(),
      })
      .where(eq(batches.batchId, batchId))
      .returning();

    await this.invalidateCache();
    return updated;
  }

  async remove(batchId: string) {
    await this.getBatchOrThrow(batchId);
    await this.db
      .update(batches)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batches.batchId, batchId));
    await this.invalidateCache();
    return { success: true };
  }

  // ─── Subjects ──────────────────────────────────────────────────────────────

  async listSubjects(batchId: string) {
    await this.getBatchOrThrow(batchId);
    return this.db
      .select()
      .from(batchSubjects)
      .where(
        and(eq(batchSubjects.batchId, batchId), eq(batchSubjects.isDeleted, false))
      )
      .orderBy(asc(batchSubjects.displayOrder), asc(batchSubjects.name));
  }

  async createSubject(batchId: string, dto: CreateBatchSubjectDto) {
    await this.getBatchOrThrow(batchId);
    const [created] = await this.db
      .insert(batchSubjects)
      .values({
        batchId,
        name: dto.name,
        color: dto.color,
        displayOrder: dto.displayOrder ?? 0,
      })
      .returning();
    return created;
  }

  async updateSubject(
    batchId: string,
    subjectId: string,
    dto: UpdateBatchSubjectDto
  ) {
    const [existing] = await this.db
      .select()
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.subjectId, subjectId),
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Subject not found");

    const [updated] = await this.db
      .update(batchSubjects)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        updatedAt: new Date(),
      })
      .where(eq(batchSubjects.subjectId, subjectId))
      .returning();
    return updated;
  }

  async deleteSubject(batchId: string, subjectId: string) {
    const [existing] = await this.db
      .select()
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.subjectId, subjectId),
          eq(batchSubjects.batchId, batchId)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Subject not found");
    await this.db
      .update(batchSubjects)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchSubjects.subjectId, subjectId));
    return { success: true };
  }

  // ─── Sessions ──────────────────────────────────────────────────────────────

  async listSessions(
    batchId: string,
    opts: { userId?: string; userRole?: string; type?: "LIVE" | "RECORDING" }
  ) {
    await this.getBatchOrThrow(batchId);

    const canSeeAll = this.isAdmin(opts.userRole);
    if (!canSeeAll) {
      if (!opts.userId) throw new ForbiddenException("Authentication required");
      await this.assertEnrolled(batchId, opts.userId);
    }

    const conditions = [
      eq(batchSessions.batchId, batchId),
      eq(batchSessions.isDeleted, false),
    ];
    if (opts.type) conditions.push(eq(batchSessions.type, opts.type));

    const sessions = await this.db
      .select()
      .from(batchSessions)
      .where(and(...conditions))
      .orderBy(
        desc(sql`coalesce(${batchSessions.scheduledStartAt}, ${batchSessions.createdAt})`)
      );

    return sessions.map((s) => ({
      ...s,
      recordingThumbnail: this.resolveImageUrl(s.recordingThumbnail),
    }));
  }

  async getSessionWithPlayback(
    batchId: string,
    sessionId: string,
    userId: string | undefined,
    userRole: string | undefined
  ) {
    await this.getBatchOrThrow(batchId);
    const canSeeAll = this.isAdmin(userRole);
    if (!canSeeAll) {
      if (!userId) throw new ForbiddenException("Authentication required");
      await this.assertEnrolled(batchId, userId);
    }

    const [session] = await this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.sessionId, sessionId),
          eq(batchSessions.batchId, batchId),
          eq(batchSessions.isDeleted, false)
        )
      )
      .limit(1);
    if (!session) throw new NotFoundException("Session not found");

    let playbackUrl: string | null = null;
    if (session.recordingVideoId) {
      try {
        playbackUrl = this.cdnService.getSignedEmbedUrl(session.recordingVideoId);
      } catch {
        playbackUrl = null;
      }
    }

    return {
      ...session,
      recordingThumbnail: this.resolveImageUrl(session.recordingThumbnail),
      playbackUrl,
    };
  }

  async createSession(batchId: string, dto: CreateBatchSessionDto) {
    await this.getBatchOrThrow(batchId);

    if (dto.type === "LIVE") {
      if (!dto.scheduledStartAt || !dto.scheduledEndAt) {
        throw new BadRequestException(
          "LIVE sessions require scheduledStartAt and scheduledEndAt"
        );
      }
      if (new Date(dto.scheduledEndAt) <= new Date(dto.scheduledStartAt)) {
        throw new BadRequestException("scheduledEndAt must be after scheduledStartAt");
      }
      if (!dto.liveProvider) {
        throw new BadRequestException("LIVE sessions require liveProvider");
      }
      if (dto.liveProvider !== "GOOGLE_MEET" && !dto.joinUrl) {
        throw new BadRequestException(
          "joinUrl is required for non-Google-Meet live providers"
        );
      }
    }

    if (dto.type === "RECORDING" && !dto.recordingVideoId) {
      throw new BadRequestException(
        "RECORDING sessions require recordingVideoId (Bunny Stream ID)"
      );
    }

    const [created] = await this.db
      .insert(batchSessions)
      .values({
        batchId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        liveProvider: dto.liveProvider,
        joinUrl: dto.joinUrl,
        meetingId: dto.meetingId,
        meetingPasscode: dto.meetingPasscode,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null,
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
        status: dto.type === "LIVE" ? "SCHEDULED" : "ENDED",
        recordingVideoId: dto.recordingVideoId,
        recordingDurationSeconds: dto.recordingDurationSeconds,
        recordingThumbnail: dto.recordingThumbnail,
        resources: dto.resources,
      })
      .returning();

    return created;
  }

  async updateSession(
    batchId: string,
    sessionId: string,
    dto: UpdateBatchSessionDto
  ) {
    const [existing] = await this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.sessionId, sessionId),
          eq(batchSessions.batchId, batchId),
          eq(batchSessions.isDeleted, false)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Session not found");

    const [updated] = await this.db
      .update(batchSessions)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
        ...(dto.liveProvider !== undefined && { liveProvider: dto.liveProvider }),
        ...(dto.joinUrl !== undefined && { joinUrl: dto.joinUrl }),
        ...(dto.meetingId !== undefined && { meetingId: dto.meetingId }),
        ...(dto.meetingPasscode !== undefined && {
          meetingPasscode: dto.meetingPasscode,
        }),
        ...(dto.scheduledStartAt !== undefined && {
          scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null,
        }),
        ...(dto.scheduledEndAt !== undefined && {
          scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
        }),
        ...(dto.recordingVideoId !== undefined && {
          recordingVideoId: dto.recordingVideoId,
        }),
        ...(dto.recordingDurationSeconds !== undefined && {
          recordingDurationSeconds: dto.recordingDurationSeconds,
        }),
        ...(dto.recordingThumbnail !== undefined && {
          recordingThumbnail: dto.recordingThumbnail,
        }),
        ...(dto.resources !== undefined && { resources: dto.resources }),
        updatedAt: new Date(),
      })
      .where(eq(batchSessions.sessionId, sessionId))
      .returning();
    return updated;
  }

  async deleteSession(batchId: string, sessionId: string) {
    const [existing] = await this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.sessionId, sessionId),
          eq(batchSessions.batchId, batchId)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Session not found");
    await this.db
      .update(batchSessions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchSessions.sessionId, sessionId));
    return { success: true };
  }

  // ─── Enrollments ───────────────────────────────────────────────────────────

  async listEnrollments(
    batchId: string,
    opts: { page?: number; limit?: number; search?: string }
  ) {
    await this.getBatchOrThrow(batchId);
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(batchEnrollments.batchId, batchId),
      eq(batchEnrollments.status, "ACTIVE"),
    ];
    if (opts.search) {
      const pattern = `%${opts.search}%`;
      conditions.push(
        or(
          ilike(users.email, pattern),
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern)
        )!
      );
    }

    const where = and(...conditions);

    const [rows, [{ count }]] = await Promise.all([
      this.db
        .select({
          enrollment: batchEnrollments,
          user: {
            userId: users.userId,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImage: users.profileImage,
          },
        })
        .from(batchEnrollments)
        .innerJoin(users, eq(batchEnrollments.userId, users.userId))
        .where(where)
        .orderBy(desc(batchEnrollments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(batchEnrollments)
        .innerJoin(users, eq(batchEnrollments.userId, users.userId))
        .where(where),
    ]);

    return {
      data: rows.map((r) => ({
        ...r.enrollment,
        user: {
          ...r.user,
          profileImage: this.resolveImageUrl(r.user.profileImage),
        },
      })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async addEnrollments(
    batchId: string,
    dto: CreateBatchEnrollmentsDto,
    grantedBy: string
  ) {
    const batch = await this.getBatchOrThrow(batchId);

    let targetUserIds: string[] = [...(dto.userIds ?? [])];
    const notFoundEmails: string[] = [];

    if (dto.emails && dto.emails.length > 0) {
      const found = await this.db
        .select({ userId: users.userId, email: users.email })
        .from(users)
        .where(inArray(users.email, dto.emails));
      const foundEmails = new Set(found.map((u) => u.email));
      for (const email of dto.emails) {
        if (!foundEmails.has(email)) notFoundEmails.push(email);
      }
      targetUserIds.push(...found.map((u) => u.userId));
    }

    targetUserIds = [...new Set(targetUserIds)];
    if (targetUserIds.length === 0) {
      throw new BadRequestException("No valid users to enroll");
    }

    const existing = await this.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          inArray(batchEnrollments.userId, targetUserIds)
        )
      );
    const existingSet = new Set(existing.map((e) => e.userId));
    const newUserIds = targetUserIds.filter((id) => !existingSet.has(id));

    if (newUserIds.length === 0) {
      return { enrolled: 0, alreadyEnrolled: targetUserIds.length, notFoundEmails };
    }

    const accessEndsAt = dto.accessEndsAt ? new Date(dto.accessEndsAt) : batch.endDate;
    await this.db.insert(batchEnrollments).values(
      newUserIds.map((userId) => ({
        batchId,
        userId,
        status: "ACTIVE" as const,
        accessEndsAt,
        grantedBy,
      }))
    );

    return {
      enrolled: newUserIds.length,
      alreadyEnrolled: existingSet.size,
      notFoundEmails,
    };
  }

  async removeEnrollment(batchId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Enrollment not found");
    await this.db
      .update(batchEnrollments)
      .set({ status: "REVOKED", updatedAt: new Date() })
      .where(eq(batchEnrollments.enrollmentId, existing.enrollmentId));
    return { success: true };
  }

  // ─── Announcements ─────────────────────────────────────────────────────────

  async listAnnouncements(
    batchId: string,
    opts: { userId?: string; userRole?: string }
  ) {
    await this.getBatchOrThrow(batchId);
    if (!this.isAdmin(opts.userRole)) {
      if (!opts.userId) throw new ForbiddenException("Authentication required");
      await this.assertEnrolled(batchId, opts.userId);
    }
    return this.db
      .select()
      .from(batchAnnouncements)
      .where(
        and(
          eq(batchAnnouncements.batchId, batchId),
          eq(batchAnnouncements.isDeleted, false)
        )
      )
      .orderBy(desc(batchAnnouncements.pinned), desc(batchAnnouncements.createdAt));
  }

  async createAnnouncement(
    batchId: string,
    dto: CreateBatchAnnouncementDto,
    authorId: string
  ) {
    await this.getBatchOrThrow(batchId);
    const [created] = await this.db
      .insert(batchAnnouncements)
      .values({
        batchId,
        authorId,
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned ?? false,
      })
      .returning();
    return created;
  }

  async updateAnnouncement(
    batchId: string,
    announcementId: string,
    dto: UpdateBatchAnnouncementDto
  ) {
    const [existing] = await this.db
      .select()
      .from(batchAnnouncements)
      .where(
        and(
          eq(batchAnnouncements.announcementId, announcementId),
          eq(batchAnnouncements.batchId, batchId),
          eq(batchAnnouncements.isDeleted, false)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Announcement not found");

    const [updated] = await this.db
      .update(batchAnnouncements)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.pinned !== undefined && { pinned: dto.pinned }),
        updatedAt: new Date(),
      })
      .where(eq(batchAnnouncements.announcementId, announcementId))
      .returning();
    return updated;
  }

  async deleteAnnouncement(batchId: string, announcementId: string) {
    const [existing] = await this.db
      .select()
      .from(batchAnnouncements)
      .where(
        and(
          eq(batchAnnouncements.announcementId, announcementId),
          eq(batchAnnouncements.batchId, batchId)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Announcement not found");
    await this.db
      .update(batchAnnouncements)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchAnnouncements.announcementId, announcementId));
    return { success: true };
  }
}
