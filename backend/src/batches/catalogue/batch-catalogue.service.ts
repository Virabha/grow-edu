import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchInstructors,
  batchQuizzes,
  batchResources,
  batchSessions,
  batchSubjects,
  batches,
  lessonProgress,
  lessons,
  payments,
  subjectLessons,
  users,
  videoEncodingJobs,
} from "../../database/schema";
import { CacheService } from "../../cache/cache.service";
import { CdnService } from "../../cdn/cdn.service";
import { CLOCK, Clock } from "../../common/clock";
import { AuditLogService } from "../../audit/audit-log.service";
import { BatchAccessService, Viewer } from "../access/batch-access.service";
import { BatchMediaService } from "../batch-media.service";
import { CreateBatchDto } from "../dto/create-batch.dto";
import { UpdateBatchDto } from "../dto/update-batch.dto";
import { FilterBatchesDto } from "../dto/filter-batches.dto";
import {
  CreateBatchSubjectDto,
  UpdateBatchSubjectDto,
} from "../dto/batch-subject.dto";
import {
  AssignInstructorDto,
  CreateLessonDto,
  ReorderLessonsDto,
  UpdateLessonDto,
} from "../dto/batch-content.dto";

const MAX_PAGE_LIMIT = 100;
const CACHE_PREFIX = "batches:";
const PUBLIC_LIST_TTL = 300;

type Instructor = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImage: string | null;
  role: "LEAD" | "SUBJECT" | "ASSISTANT" | "MENTOR";
};

@Injectable()
export class BatchCatalogueService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly media: BatchMediaService,
    private readonly cache: CacheService,
    private readonly cdn: CdnService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(filters: FilterBatchesDto, viewer: Viewer) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const isOwnerView = viewer.role === "PLATFORM_ADMIN";
    const teachingScope =
      viewer.role === "INSTRUCTOR" && viewer.userId
        ? await this.access.taughtBatchIds(viewer.userId)
        : null;
    const isPublic = !isOwnerView && teachingScope === null;

    const cacheKey = `${CACHE_PREFIX}list:public:${JSON.stringify(filters)}`;
    if (isPublic) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    if (teachingScope !== null && teachingScope.length === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const conditions = [eq(batches.isDeleted, false)];
    if (filters.targetExam)
      conditions.push(eq(batches.targetExam, filters.targetExam));
    if (filters.categoryId)
      conditions.push(eq(batches.categoryId, filters.categoryId));
    if (filters.deliveryMode)
      conditions.push(eq(batches.deliveryMode, filters.deliveryMode));
    if (filters.status) {
      conditions.push(eq(batches.status, filters.status));
    } else if (isPublic) {
      conditions.push(inArray(batches.status, ["UPCOMING", "ONGOING"]));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(batches.title, pattern),
        ilike(batches.shortDescription, pattern),
        ilike(batches.targetExam, pattern),
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    if (teachingScope !== null) {
      conditions.push(inArray(batches.batchId, teachingScope));
    }
    if (filters.instructorId) {
      const taught = await this.access.taughtBatchIds(filters.instructorId);
      if (taught.length === 0) {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      conditions.push(inArray(batches.batchId, taught));
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

    const teachers = await this.instructorsFor(rows.map((b) => b.batchId));

    const response = {
      data: rows.map((b) => ({
        ...this.present(b),
        teachers: teachers.get(b.batchId) ?? [],
      })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };

    if (isPublic) await this.cache.set(cacheKey, response, PUBLIC_LIST_TTL);
    return response;
  }

  async findOne(idOrSlug: string, viewer: Viewer) {
    const [batch] = await this.db
      .select()
      .from(batches)
      .where(
        and(
          or(eq(batches.batchId, idOrSlug), eq(batches.slug, idOrSlug)),
          eq(batches.isDeleted, false),
        ),
      )
      .limit(1);
    if (!batch) throw new NotFoundException("Batch not found");

    let isEnrolled = false;
    let pendingPaymentId: string | null = null;
    let pendingPaymentStatus: "PENDING" | "PROOF_UPLOADED" | null = null;

    if (viewer.userId) {
      isEnrolled = await this.access.isEnrolled(batch.batchId, viewer.userId);
      if (!isEnrolled) {
        const [match] = await this.db
          .select({ paymentId: payments.paymentId, status: payments.status })
          .from(payments)
          .where(
            and(
              eq(payments.userId, viewer.userId),
              eq(payments.batchId, batch.batchId),
              inArray(payments.status, ["PENDING", "PROOF_UPLOADED"]),
            ),
          )
          .limit(1);
        if (match) {
          pendingPaymentId = match.paymentId;
          pendingPaymentStatus =
            match.status === "PROOF_UPLOADED" ? "PROOF_UPLOADED" : "PENDING";
        }
      }
    }

    const [subjects, teachers] = await Promise.all([
      this.listSubjects(batch.batchId),
      this.instructorsFor([batch.batchId]),
    ]);

    return {
      ...this.present(batch),
      subjects,
      teachers: teachers.get(batch.batchId) ?? [],
      isEnrolled,
      pendingPaymentId,
      pendingPaymentStatus,
      canManage: await this.access.isStaff(batch.batchId, viewer),
    };
  }

  async create(dto: CreateBatchDto, createdBy: string) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException("endDate must be after startDate");
    }
    await this.assertSlugFree(dto.slug);

    const created = await this.db.transaction(async (tx) => {
      const [batch] = await tx
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
            dto.compareAtPrice != null
              ? dto.compareAtPrice.toString()
              : undefined,
          currency: dto.currency ?? "INR",
          capacity: dto.capacity,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          deliveryMode: dto.deliveryMode ?? "LIVE",
          categoryId: dto.categoryId,
          status: dto.status ?? "DRAFT",
          createdBy,
          publishedAt:
            dto.status === "UPCOMING" || dto.status === "ONGOING"
              ? new Date()
              : undefined,
        })
        .returning();

      if (dto.instructors && dto.instructors.length > 0) {
        await tx.insert(batchInstructors).values(
          dto.instructors.map((i) => ({
            batchId: batch.batchId,
            instructorId: i.instructorId,
            role: i.role ?? ("SUBJECT" as const),
            assignedBy: createdBy,
          })),
        );
      }

      return batch;
    });

    await this.invalidate();
    return created;
  }

  async update(batchId: string, dto: UpdateBatchDto) {
    await this.access.requireBatch(batchId);
    if (
      dto.startDate &&
      dto.endDate &&
      new Date(dto.endDate) <= new Date(dto.startDate)
    ) {
      throw new BadRequestException("endDate must be after startDate");
    }
    if (dto.slug) await this.assertSlugFree(dto.slug, batchId);

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
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.deliveryMode !== undefined && {
          deliveryMode: dto.deliveryMode,
        }),
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

    await this.invalidate();
    return updated;
  }

  async remove(batchId: string) {
    await this.access.requireBatch(batchId);
    await this.db
      .update(batches)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batches.batchId, batchId));
    await this.invalidate();
    return { success: true };
  }

  async listInstructors(batchId: string) {
    await this.access.requireBatch(batchId);
    return (await this.instructorsFor([batchId])).get(batchId) ?? [];
  }

  async assignInstructor(
    batchId: string,
    dto: AssignInstructorDto,
    assignedBy: string,
  ) {
    await this.access.requireBatch(batchId);
    const [instructor] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, dto.instructorId))
      .limit(1);
    if (!instructor) throw new NotFoundException("Instructor not found");
    if (instructor.role !== "INSTRUCTOR") {
      throw new BadRequestException("That account is not an instructor");
    }

    const [assignment] = await this.db
      .insert(batchInstructors)
      .values({
        batchId,
        instructorId: dto.instructorId,
        role: dto.role ?? "SUBJECT",
        assignedBy,
      })
      .onConflictDoUpdate({
        target: [batchInstructors.batchId, batchInstructors.instructorId],
        set: { role: dto.role ?? "SUBJECT" },
      })
      .returning();
    return assignment;
  }

  async removeInstructor(batchId: string, instructorId: string) {
    await this.access.requireBatch(batchId);
    const deleted = await this.db
      .delete(batchInstructors)
      .where(
        and(
          eq(batchInstructors.batchId, batchId),
          eq(batchInstructors.instructorId, instructorId),
        ),
      )
      .returning({ id: batchInstructors.batchInstructorId });
    if (deleted.length === 0) {
      throw new NotFoundException("Instructor is not assigned to this batch");
    }
    return { success: true };
  }

  async listSubjects(batchId: string) {
    return this.db
      .select()
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      )
      .orderBy(asc(batchSubjects.displayOrder), asc(batchSubjects.name));
  }

  async createSubject(batchId: string, dto: CreateBatchSubjectDto) {
    await this.access.requireBatch(batchId);
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
    dto: UpdateBatchSubjectDto,
  ) {
    await this.requireSubject(batchId, subjectId);
    const [updated] = await this.db
      .update(batchSubjects)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.displayOrder !== undefined && {
          displayOrder: dto.displayOrder,
        }),
        updatedAt: new Date(),
      })
      .where(eq(batchSubjects.subjectId, subjectId))
      .returning();
    return updated;
  }

  async deleteSubject(batchId: string, subjectId: string) {
    await this.requireSubject(batchId, subjectId);
    await this.db
      .update(batchSubjects)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchSubjects.subjectId, subjectId));
    return { success: true };
  }

  async listContent(batchId: string, viewer: Viewer) {
    const { isStaff, enrollment } = await this.access.require(
      batchId,
      viewer,
      "READ",
    );
    const subjects = await this.listSubjects(batchId);
    if (subjects.length === 0) return [];

    const rows = await this.db
      .select({ lesson: lessons, placement: subjectLessons })
      .from(subjectLessons)
      .innerJoin(lessons, eq(lessons.lessonId, subjectLessons.lessonId))
      .where(
        and(
          inArray(
            subjectLessons.subjectId,
            subjects.map((s) => s.subjectId),
          ),
          eq(subjectLessons.isDeleted, false),
          eq(lessons.isDeleted, false),
        ),
      )
      .orderBy(asc(subjectLessons.subjectId), asc(subjectLessons.order));

    const now = this.clock.now();
    const placed = rows.map((r) => {
      const unlocksAt = this.access.unlockTimeFor(r.placement, enrollment);
      const locked =
        !isStaff && unlocksAt !== null && unlocksAt.getTime() > now.getTime();
      return {
        ...r.lesson,
        subjectId: r.placement.subjectId,
        order: r.placement.order,
        unlocksAt: unlocksAt ? unlocksAt.toISOString() : null,
        locked,
        videoUrl: locked ? null : r.lesson.videoUrl,
        textContent: locked ? null : r.lesson.textContent,
      };
    });
    const visible = isStaff
      ? placed
      : placed.filter((l) => l.status === "READY" || l.isFreePreview);

    return subjects.map((subject) => ({
      ...subject,
      lessons: visible.filter((l) => l.subjectId === subject.subjectId),
    }));
  }

  async previewContent(batchId: string) {
    const subjects = await this.listSubjects(batchId);
    if (subjects.length === 0) return [];
    const rows = await this.db
      .select({
        lessonId: lessons.lessonId,
        subjectId: subjectLessons.subjectId,
        title: lessons.title,
        type: lessons.type,
        duration: lessons.duration,
        isFreePreview: lessons.isFreePreview,
        order: subjectLessons.order,
      })
      .from(subjectLessons)
      .innerJoin(lessons, eq(lessons.lessonId, subjectLessons.lessonId))
      .where(
        and(
          inArray(
            subjectLessons.subjectId,
            subjects.map((s) => s.subjectId),
          ),
          eq(subjectLessons.isDeleted, false),
          eq(lessons.isDeleted, false),
          eq(lessons.status, "READY"),
        ),
      )
      .orderBy(asc(subjectLessons.order));

    return subjects.map((subject) => ({
      subjectId: subject.subjectId,
      name: subject.name,
      lessons: rows.filter((l) => l.subjectId === subject.subjectId),
    }));
  }

  async getLesson(batchId: string, lessonId: string, viewer: Viewer) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      "READ",
      batchId,
    );
    const playbackUrl = await this.signedPlaybackFor(lesson);

    if (lesson.type !== "LIVE_SESSION" || lesson.sessionId === null) {
      return { ...lesson, playbackUrl };
    }
    const [session] = await this.db
      .select()
      .from(batchSessions)
      .where(eq(batchSessions.sessionId, lesson.sessionId));
    return { ...lesson, playbackUrl, session: session ?? null };
  }

  private async signedPlaybackFor(
    lesson: typeof lessons.$inferSelect,
  ): Promise<string | null> {
    if (lesson.type !== "VIDEO" && lesson.type !== "AUDIO") return null;
    const [job] = await this.db
      .select({ outputPath: videoEncodingJobs.outputPath })
      .from(videoEncodingJobs)
      .where(
        and(
          eq(videoEncodingJobs.lessonId, lesson.lessonId),
          eq(videoEncodingJobs.status, "COMPLETED"),
          eq(
            videoEncodingJobs.renditionKind,
            lesson.type === "AUDIO" ? "AUDIO" : "VIDEO",
          ),
        ),
      );
    if (!job || job.outputPath === null) return null;
    try {
      return this.cdn.getSignedEmbedUrl(job.outputPath);
    } catch {
      return null;
    }
  }

  async createLesson(batchId: string, dto: CreateLessonDto, viewer: Viewer) {
    await this.requireSubject(batchId, dto.subjectId);
    await this.requireTypeTargets(batchId, dto.type, dto);
    const status = this.settableStatus(dto.status ?? "DRAFT", viewer);
    const [created] = await this.db
      .insert(lessons)
      .values({
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        videoUrl: dto.videoUrl,
        textContent: dto.textContent,
        resources: dto.resources,
        duration: dto.duration,
        audioUrl: dto.audioUrl,
        audioDuration: dto.audioDuration,
        documentFileKey: dto.documentFileKey,
        documentPageCount: dto.documentPageCount,
        sessionId: dto.sessionId,
        quizId: dto.quizId,
        isFreePreview: dto.isFreePreview ?? false,
        status,
        order: dto.order,
        createdBy: viewer.userId ?? null,
        submittedAt: status === "PENDING_APPROVAL" ? this.clock.now() : null,
      })
      .returning();

    await this.db.insert(subjectLessons).values({
      subjectId: dto.subjectId,
      lessonId: created.lessonId,
      order: dto.order,
    });

    if (created.type === "DOCUMENT" && created.documentFileKey !== null) {
      return this.mirrorLessonToResource(batchId, created, viewer);
    }

    return created;
  }

  private async mirrorLessonToResource(
    batchId: string,
    lesson: typeof lessons.$inferSelect,
    viewer: Viewer,
  ) {
    const now = this.clock.now();
    const [resource] = await this.db
      .insert(batchResources)
      .values({
        batchId,
        subjectId: lesson.subjectId,
        title: lesson.title,
        description: lesson.description,
        type: "NOTES",
        fileKey: lesson.documentFileKey ?? "",
        pageCount: lesson.documentPageCount,
        lessonId: lesson.lessonId,
        publishAt: lesson.publishAt,
        uploadedBy: viewer.userId ?? lesson.createdBy ?? "",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const [linked] = await this.db
      .update(lessons)
      .set({ resourceId: resource.resourceId, updatedAt: now })
      .where(eq(lessons.lessonId, lesson.lessonId))
      .returning();

    return linked;
  }

  private async requireTypeTargets(
    batchId: string,
    type: CreateLessonDto["type"] | undefined,
    dto: Pick<CreateLessonDto, "sessionId" | "quizId">,
  ): Promise<void> {
    if (type === "LIVE_SESSION") {
      if (!dto.sessionId) {
        throw new BadRequestException(
          "A live-session lesson must name the batch session it resolves to",
        );
      }
      const [session] = await this.db
        .select({ sessionId: batchSessions.sessionId })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.sessionId, dto.sessionId),
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.isDeleted, false),
          ),
        );
      if (!session) {
        throw new NotFoundException("That session is not on this batch");
      }
    }
    if (type === "QUIZ" && dto.quizId) {
      const [quiz] = await this.db
        .select({ quizId: batchQuizzes.quizId })
        .from(batchQuizzes)
        .where(
          and(
            eq(batchQuizzes.quizId, dto.quizId),
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizzes.isDeleted, false),
          ),
        );
      if (!quiz) {
        throw new NotFoundException("That quiz is not on this batch");
      }
    }
  }

  async approveLesson(batchId: string, lessonId: string, viewer: Viewer) {
    if (viewer.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenException(
        "Only the platform owner can publish a lesson to students",
      );
    }
    await this.requireLesson(batchId, lessonId);
    const [approved] = await this.db
      .update(lessons)
      .set({ status: "READY", updatedAt: new Date() })
      .where(eq(lessons.lessonId, lessonId))
      .returning();
    return approved;
  }

  private async assertNoProgressRecorded(lessonId: string): Promise<void> {
    const [recorded] = await this.db
      .select({ lessonProgressId: lessonProgress.lessonProgressId })
      .from(lessonProgress)
      .where(eq(lessonProgress.lessonId, lessonId))
      .limit(1);
    if (recorded) {
      throw new ConflictException(
        "A lesson's type cannot change once a student has progress against it",
      );
    }
  }

  private settableStatus(
    requested: NonNullable<CreateLessonDto["status"]>,
    viewer: Viewer,
  ): NonNullable<CreateLessonDto["status"]> {
    if (viewer.role === "PLATFORM_ADMIN") return requested;
    return requested === "READY" ? "PENDING_APPROVAL" : requested;
  }

  async updateLesson(
    batchId: string,
    lessonId: string,
    dto: UpdateLessonDto,
    viewer: Viewer,
  ) {
    const existing = await this.requireLesson(batchId, lessonId);
    if (dto.subjectId && dto.subjectId !== existing.subjectId) {
      await this.requireSubject(batchId, dto.subjectId);
    }
    if (dto.type !== undefined && dto.type !== existing.type) {
      await this.assertNoProgressRecorded(lessonId);
    }
    await this.requireTypeTargets(batchId, dto.type ?? existing.type, {
      sessionId: dto.sessionId ?? existing.sessionId ?? undefined,
      quizId: dto.quizId ?? existing.quizId ?? undefined,
    });

    const [updated] = await this.db
      .update(lessons)
      .set({
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.textContent !== undefined && { textContent: dto.textContent }),
        ...(dto.resources !== undefined && { resources: dto.resources }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.audioUrl !== undefined && { audioUrl: dto.audioUrl }),
        ...(dto.audioDuration !== undefined && {
          audioDuration: dto.audioDuration,
        }),
        ...(dto.documentFileKey !== undefined && {
          documentFileKey: dto.documentFileKey,
          documentVersion: existing.documentVersion + 1,
        }),
        ...(dto.documentPageCount !== undefined && {
          documentPageCount: dto.documentPageCount,
        }),
        ...(dto.sessionId !== undefined && { sessionId: dto.sessionId }),
        ...(dto.quizId !== undefined && { quizId: dto.quizId }),
        ...(dto.isFreePreview !== undefined && {
          isFreePreview: dto.isFreePreview,
        }),
        ...(dto.status !== undefined && {
          status: this.settableStatus(dto.status, viewer),
        }),
        ...(dto.order !== undefined && { order: dto.order }),
        updatedAt: new Date(),
      })
      .where(eq(lessons.lessonId, lessonId))
      .returning();

    await this.auditLog.record({
      action: "content.edit",
      targetType: "lesson",
      targetId: lessonId,
      before: {
        batchId,
        title: existing.title,
        status: existing.status,
        isFreePreview: existing.isFreePreview,
      },
      after: {
        batchId,
        title: updated.title,
        status: updated.status,
        isFreePreview: updated.isFreePreview,
      },
    });

    return updated;
  }

  async deleteLesson(batchId: string, lessonId: string) {
    const existing = await this.requireLesson(batchId, lessonId);
    const subjectIds = await this.subjectIdsFor(batchId);

    await this.db.transaction(async (tx) => {
      await tx
        .update(subjectLessons)
        .set({ isDeleted: true })
        .where(
          and(
            eq(subjectLessons.lessonId, lessonId),
            inArray(subjectLessons.subjectId, subjectIds),
          ),
        );

      const [remaining] = await tx
        .select({ placementId: subjectLessons.placementId })
        .from(subjectLessons)
        .where(
          and(
            eq(subjectLessons.lessonId, lessonId),
            eq(subjectLessons.isDeleted, false),
          ),
        )
        .limit(1);

      if (!remaining) {
        await tx
          .update(lessons)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(eq(lessons.lessonId, lessonId));

        if (existing.resourceId !== null) {
          await tx
            .update(batchResources)
            .set({ isDeleted: true, updatedAt: this.clock.now() })
            .where(eq(batchResources.resourceId, existing.resourceId));
        }
      }
    });

    await this.auditLog.record({
      action: "content.delete",
      targetType: "lesson",
      targetId: lessonId,
      before: { batchId, title: existing.title },
      after: { batchId, removedFromBatch: true },
    });

    return { success: true };
  }

  async reorderLessons(batchId: string, dto: ReorderLessonsDto) {
    const subjectIds = await this.subjectIdsFor(batchId);
    const owned = await this.db
      .select({ lessonId: subjectLessons.lessonId })
      .from(subjectLessons)
      .where(
        and(
          inArray(
            subjectLessons.lessonId,
            dto.lessons.map((l) => l.lessonId),
          ),
          inArray(subjectLessons.subjectId, subjectIds),
          eq(subjectLessons.isDeleted, false),
        ),
      );
    if (owned.length !== dto.lessons.length) {
      throw new NotFoundException("Lesson not found in this batch");
    }

    await this.db.transaction(async (tx) => {
      for (const { lessonId, order } of dto.lessons) {
        await tx
          .update(subjectLessons)
          .set({ order })
          .where(
            and(
              eq(subjectLessons.lessonId, lessonId),
              inArray(subjectLessons.subjectId, subjectIds),
            ),
          );
      }
    });
    return { success: true };
  }

  private async subjectIdsFor(batchId: string): Promise<string[]> {
    await this.access.requireBatch(batchId);
    const rows = await this.db
      .select({ subjectId: batchSubjects.subjectId })
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      );
    return rows.map((r) => r.subjectId);
  }

  private async requireLesson(batchId: string, lessonId: string) {
    const [row] = await this.db
      .select({ lesson: lessons })
      .from(subjectLessons)
      .innerJoin(lessons, eq(lessons.lessonId, subjectLessons.lessonId))
      .innerJoin(
        batchSubjects,
        eq(batchSubjects.subjectId, subjectLessons.subjectId),
      )
      .where(
        and(
          eq(subjectLessons.lessonId, lessonId),
          eq(subjectLessons.isDeleted, false),
          eq(lessons.isDeleted, false),
          eq(batchSubjects.batchId, batchId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Lesson not found");
    return row.lesson;
  }

  private async requireSubject(batchId: string, subjectId: string) {
    const [subject] = await this.db
      .select()
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.subjectId, subjectId),
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      )
      .limit(1);
    if (!subject) throw new NotFoundException("Subject not found");
    return subject;
  }

  private async assertSlugFree(slug: string, exceptBatchId?: string) {
    const [conflict] = await this.db
      .select({ batchId: batches.batchId })
      .from(batches)
      .where(eq(batches.slug, slug))
      .limit(1);
    if (conflict && conflict.batchId !== exceptBatchId) {
      throw new ConflictException("Slug already in use");
    }
  }

  private async instructorsFor(
    batchIds: string[],
  ): Promise<Map<string, Instructor[]>> {
    const byBatch = new Map<string, Instructor[]>();
    if (batchIds.length === 0) return byBatch;

    const rows = await this.db
      .select({
        batchId: batchInstructors.batchId,
        role: batchInstructors.role,
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImage: users.profileImage,
      })
      .from(batchInstructors)
      .innerJoin(users, eq(users.userId, batchInstructors.instructorId))
      .where(inArray(batchInstructors.batchId, batchIds));

    for (const row of rows) {
      const list = byBatch.get(row.batchId) ?? [];
      list.push({
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        profileImage: this.media.url(row.profileImage),
        role: row.role,
      });
      byBatch.set(row.batchId, list);
    }
    return byBatch;
  }

  private present(batch: typeof batches.$inferSelect) {
    return {
      ...batch,
      thumbnail: this.media.url(batch.thumbnail),
      bannerImage: this.media.url(batch.bannerImage),
      price: Number(batch.price),
      compareAtPrice:
        batch.compareAtPrice == null ? null : Number(batch.compareAtPrice),
    };
  }

  private async invalidate(): Promise<void> {
    await this.cache.delByPrefix(CACHE_PREFIX);
  }
}
