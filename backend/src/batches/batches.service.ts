import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
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
  batchResources,
  batchDoubts,
  batchDoubtReplies,
  batchAttendance,
  batchQuizzes,
  batchQuizQuestions,
  batchQuizAttempts,
  users,
} from "../database/schema";
import { FilesService } from "../files/files.service";
import { CdnService } from "../cdn/cdn.service";
import { CacheService } from "../cache/cache.service";
import { EmailService } from "../email/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentService } from "../payment/payment.service";
import { payments } from "../database/schema";
import { CouponsService } from "../coupons/coupons.service";
import { coupons, couponUsages, batchCertificates } from "../database/schema";
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
import {
  CreateBatchResourceDto,
  UpdateBatchResourceDto,
} from "./dto/batch-resource.dto";
import {
  CreateBatchDoubtDto,
  UpdateBatchDoubtDto,
  CreateDoubtReplyDto,
} from "./dto/batch-doubt.dto";
import { RecordAttendanceDto } from "./dto/batch-attendance.dto";
import {
  CreateBatchQuizDto,
  UpdateBatchQuizDto,
  CreateQuizQuestionDto,
  UpdateQuizQuestionDto,
  SubmitQuizAnswerDto,
} from "./dto/batch-quiz.dto";

const MAX_PAGE_LIMIT = 50;
const CACHE_PREFIX = "batches:";
const PUBLIC_LIST_TTL = 300;

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class BatchesService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    private readonly filesService: FilesService,
    private readonly cdnService: CdnService,
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly paymentService: PaymentService,
    private readonly couponsService: CouponsService
  ) {}

  onModuleInit(): void {
    this.paymentService.registerBatchEnrollHandler(
      async (batchId: string, userId: string, paymentId: string): Promise<void> => {
        await this.enrollSingle(batchId, userId, paymentId);
      }
    );
  }

  async startBatchCheckout(
    batchId: string,
    userId: string,
    opts: { couponCode?: string } = {}
  ) {
    const batch = await this.getBatchOrThrow(batchId);
    if (batch.status !== "UPCOMING" && batch.status !== "ONGOING") {
      throw new BadRequestException("Batch is not open for enrollment");
    }
    const [existing] = await this.db
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
    if (existing) throw new BadRequestException("Already enrolled in this batch");

    if (batch.capacity != null) {
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(batchEnrollments)
        .where(
          and(
            eq(batchEnrollments.batchId, batchId),
            eq(batchEnrollments.status, "ACTIVE")
          )
        );
      if (count >= batch.capacity) throw new BadRequestException("Batch is full");
    }

    const originalAmount = Number(batch.price);
    let finalAmount = originalAmount;
    let discountAmount = 0;
    let couponId: string | null = null;

    if (opts.couponCode && originalAmount > 0) {
      const code = opts.couponCode.trim().toUpperCase();
      const [coupon] = await this.db
        .select()
        .from(coupons)
        .where(
          and(
            sql`UPPER(${coupons.couponCode}) = ${code}`,
            eq(coupons.isDeleted, false),
            eq(coupons.isActive, true)
          )
        )
        .limit(1);
      if (!coupon) throw new BadRequestException("Coupon not found");

      const now = new Date();
      if (coupon.validFrom > now) {
        throw new BadRequestException("Coupon is not yet valid");
      }
      if (coupon.validTill < now) {
        throw new BadRequestException("Coupon has expired");
      }
      if (
        coupon.minPurchaseAmount != null &&
        originalAmount < Number(coupon.minPurchaseAmount)
      ) {
        throw new BadRequestException(
          `Minimum purchase amount is ${coupon.minPurchaseAmount}`
        );
      }
      if (coupon.usageLimit != null) {
        const [{ used }] = await this.db
          .select({ used: sql<number>`count(*)::int` })
          .from(couponUsages)
          .where(
            and(
              eq(couponUsages.couponId, coupon.couponId),
              inArray(couponUsages.status, ["RESERVED", "CONSUMED"])
            )
          );
        if (used >= coupon.usageLimit) {
          throw new BadRequestException("Coupon usage limit reached");
        }
      }
      if (coupon.usageLimitPerUser != null) {
        const [{ used }] = await this.db
          .select({ used: sql<number>`count(*)::int` })
          .from(couponUsages)
          .where(
            and(
              eq(couponUsages.couponId, coupon.couponId),
              eq(couponUsages.userId, userId),
              inArray(couponUsages.status, ["RESERVED", "CONSUMED"])
            )
          );
        if (used >= coupon.usageLimitPerUser) {
          throw new BadRequestException("You have already used this coupon");
        }
      }

      if (coupon.discountType === "PERCENTAGE") {
        discountAmount = (originalAmount * Number(coupon.discountValue)) / 100;
        if (coupon.maxDiscountAmount != null) {
          discountAmount = Math.min(
            discountAmount,
            Number(coupon.maxDiscountAmount)
          );
        }
      } else {
        discountAmount = Number(coupon.discountValue);
      }
      discountAmount = Math.min(originalAmount, Number(discountAmount.toFixed(2)));
      finalAmount = Math.max(0, originalAmount - discountAmount);
      couponId = coupon.couponId;
    }

    if (finalAmount === 0) {
      const enrollment = await this.enrollSingle(batchId, userId);
      return {
        paymentId: null as string | null,
        enrolled: true,
        enrollment,
        originalAmount,
        discountAmount,
        finalAmount: 0,
      };
    }

    const [payment] = await this.db
      .insert(payments)
      .values({
        userId,
        itemType: "BATCH",
        amount: finalAmount.toString(),
        originalAmount: originalAmount.toString(),
        discountAmount: discountAmount > 0 ? discountAmount.toString() : undefined,
        couponId: couponId ?? undefined,
        currency: batch.currency,
        gateway: "MANUAL_QR",
        status: "PENDING",
        metadata: { batchId, batchTitle: batch.title, batchSlug: batch.slug },
      })
      .returning();

    if (couponId) {
      try {
        await this.couponsService.reserveUsageForPayment({
          couponId,
          userId,
          paymentId: payment.paymentId,
          originalAmount,
          discountAmount,
          finalAmount,
        });
      } catch (err) {
        // Roll back the payment if reservation fails
        await this.db.delete(payments).where(eq(payments.paymentId, payment.paymentId));
        throw err;
      }
    }

    return {
      paymentId: payment.paymentId as string | null,
      enrolled: false,
      enrollment: undefined,
      originalAmount,
      discountAmount,
      finalAmount,
    };
  }

  private async getEnrolledUserIds(batchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE")
        )
      );
    return rows.map((r) => r.userId);
  }

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
    const batch = await this.getBatchOrThrow(batchId);

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

    if (dto.type === "LIVE") {
      const enrolledIds = await this.getEnrolledUserIds(batchId);
      await this.notificationsService.fanout(enrolledIds, {
        type: "BATCH_SESSION_SCHEDULED",
        title: `New live class: ${dto.title}`,
        body: dto.scheduledStartAt
          ? `Scheduled for ${new Date(dto.scheduledStartAt).toLocaleString()}`
          : undefined,
        link: `/batches/${batch.slug}?tab=schedule`,
        batchId,
      });
    } else {
      const enrolledIds = await this.getEnrolledUserIds(batchId);
      await this.notificationsService.fanout(enrolledIds, {
        type: "BATCH_RESOURCE_ADDED",
        title: `New recording: ${dto.title}`,
        link: `/batches/${batch.slug}?tab=recordings`,
        batchId,
      });
    }

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

  async enrollSingle(batchId: string, userId: string, paymentId?: string) {
    const batch = await this.getBatchOrThrow(batchId);
    const [existing] = await this.db
      .select()
      .from(batchEnrollments)
      .where(
        and(eq(batchEnrollments.batchId, batchId), eq(batchEnrollments.userId, userId))
      )
      .limit(1);
    if (existing) {
      if (existing.status !== "ACTIVE") {
        await this.db
          .update(batchEnrollments)
          .set({ status: "ACTIVE", paymentId, updatedAt: new Date() })
          .where(eq(batchEnrollments.enrollmentId, existing.enrollmentId));
      }
      return existing;
    }
    if (batch.capacity != null) {
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(batchEnrollments)
        .where(
          and(
            eq(batchEnrollments.batchId, batchId),
            eq(batchEnrollments.status, "ACTIVE")
          )
        );
      if (count >= batch.capacity) {
        throw new BadRequestException("Batch is full");
      }
    }
    const [created] = await this.db
      .insert(batchEnrollments)
      .values({
        batchId,
        userId,
        status: "ACTIVE",
        accessEndsAt: batch.endDate,
        paymentId,
      })
      .returning();
    await this.notificationsService.create({
      userId,
      type: "BATCH_ENROLLMENT",
      title: `You're enrolled in ${batch.title}`,
      link: `/batches/${batch.slug}`,
      batchId,
    });
    return created;
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
    const batch = await this.getBatchOrThrow(batchId);
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
    const enrolledIds = await this.getEnrolledUserIds(batchId);
    await this.notificationsService.fanout(enrolledIds, {
      type: "BATCH_ANNOUNCEMENT",
      title: `Announcement: ${dto.title}`,
      body: dto.body.slice(0, 200),
      link: `/batches/${batch.slug}?tab=announcements`,
      batchId,
    });
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

  // ─── Resources (DPP / Notes / Reference) ───────────────────────────────────

  async listResources(
    batchId: string,
    opts: {
      userId?: string;
      userRole?: string;
      type?: "DPP" | "NOTES" | "REFERENCE";
      subjectId?: string;
    }
  ) {
    await this.getBatchOrThrow(batchId);
    if (!this.isAdmin(opts.userRole)) {
      if (!opts.userId) throw new ForbiddenException("Authentication required");
      await this.assertEnrolled(batchId, opts.userId);
    }
    const conditions = [
      eq(batchResources.batchId, batchId),
      eq(batchResources.isDeleted, false),
    ];
    if (opts.type) conditions.push(eq(batchResources.type, opts.type));
    if (opts.subjectId) conditions.push(eq(batchResources.subjectId, opts.subjectId));
    if (!this.isAdmin(opts.userRole)) {
      conditions.push(
        or(
          sql`${batchResources.publishAt} IS NULL`,
          sql`${batchResources.publishAt} <= now()`
        )!
      );
    }

    const rows = await this.db
      .select()
      .from(batchResources)
      .where(and(...conditions))
      .orderBy(
        asc(batchResources.type),
        asc(batchResources.dayNumber),
        desc(batchResources.createdAt)
      );

    return rows.map((r) => ({
      ...r,
      fileUrl: r.fileKey.startsWith("http")
        ? r.fileKey
        : this.filesService.getDownloadUrl(r.fileKey),
    }));
  }

  async createResource(
    batchId: string,
    dto: CreateBatchResourceDto,
    uploadedBy: string
  ) {
    const batch = await this.getBatchOrThrow(batchId);
    const [created] = await this.db
      .insert(batchResources)
      .values({
        batchId,
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        fileKey: dto.fileKey,
        fileSize: dto.fileSize,
        pageCount: dto.pageCount,
        dayNumber: dto.dayNumber,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        uploadedBy,
      })
      .returning();
    if (!dto.publishAt || new Date(dto.publishAt) <= new Date()) {
      const enrolledIds = await this.getEnrolledUserIds(batchId);
      await this.notificationsService.fanout(enrolledIds, {
        type: "BATCH_RESOURCE_ADDED",
        title: `New ${dto.type === "DPP" ? "DPP" : dto.type === "NOTES" ? "notes" : "resource"}: ${dto.title}`,
        link: `/batches/${batch.slug}?tab=resources`,
        batchId,
      });
    }
    return created;
  }

  async updateResource(
    batchId: string,
    resourceId: string,
    dto: UpdateBatchResourceDto
  ) {
    const [existing] = await this.db
      .select()
      .from(batchResources)
      .where(
        and(
          eq(batchResources.resourceId, resourceId),
          eq(batchResources.batchId, batchId),
          eq(batchResources.isDeleted, false)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Resource not found");

    const [updated] = await this.db
      .update(batchResources)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.fileKey !== undefined && { fileKey: dto.fileKey }),
        ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
        ...(dto.pageCount !== undefined && { pageCount: dto.pageCount }),
        ...(dto.dayNumber !== undefined && { dayNumber: dto.dayNumber }),
        ...(dto.publishAt !== undefined && {
          publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(batchResources.resourceId, resourceId))
      .returning();
    return updated;
  }

  async deleteResource(batchId: string, resourceId: string) {
    const [existing] = await this.db
      .select()
      .from(batchResources)
      .where(
        and(
          eq(batchResources.resourceId, resourceId),
          eq(batchResources.batchId, batchId)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Resource not found");
    await this.db
      .update(batchResources)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchResources.resourceId, resourceId));
    return { success: true };
  }

  // ─── Doubts ────────────────────────────────────────────────────────────────

  async listDoubts(
    batchId: string,
    opts: { userId: string; userRole: string; mine?: boolean; status?: string }
  ) {
    await this.getBatchOrThrow(batchId);
    if (!this.isAdmin(opts.userRole)) {
      await this.assertEnrolled(batchId, opts.userId);
    }
    const conditions = [
      eq(batchDoubts.batchId, batchId),
      eq(batchDoubts.isDeleted, false),
    ];
    if (opts.mine) conditions.push(eq(batchDoubts.askedBy, opts.userId));
    if (opts.status) {
      conditions.push(
        eq(batchDoubts.status, opts.status as "OPEN" | "ANSWERED" | "CLOSED")
      );
    }

    const rows = await this.db
      .select({
        doubt: batchDoubts,
        author: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(batchDoubts)
      .innerJoin(users, eq(batchDoubts.askedBy, users.userId))
      .where(and(...conditions))
      .orderBy(desc(batchDoubts.createdAt));

    return rows.map((r) => ({
      ...r.doubt,
      author: {
        ...r.author,
        profileImage: r.author.profileImage
          ? this.filesService.getDownloadUrl(r.author.profileImage)
          : null,
      },
    }));
  }

  async getDoubt(batchId: string, doubtId: string, userId: string, userRole: string) {
    await this.getBatchOrThrow(batchId);
    if (!this.isAdmin(userRole)) {
      await this.assertEnrolled(batchId, userId);
    }
    const [doubt] = await this.db
      .select()
      .from(batchDoubts)
      .where(
        and(
          eq(batchDoubts.doubtId, doubtId),
          eq(batchDoubts.batchId, batchId),
          eq(batchDoubts.isDeleted, false)
        )
      )
      .limit(1);
    if (!doubt) throw new NotFoundException("Doubt not found");

    const replies = await this.db
      .select({
        reply: batchDoubtReplies,
        author: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
          role: users.role,
        },
      })
      .from(batchDoubtReplies)
      .innerJoin(users, eq(batchDoubtReplies.authorId, users.userId))
      .where(
        and(
          eq(batchDoubtReplies.doubtId, doubtId),
          eq(batchDoubtReplies.isDeleted, false)
        )
      )
      .orderBy(asc(batchDoubtReplies.createdAt));

    return {
      ...doubt,
      replies: replies.map((r) => ({
        ...r.reply,
        author: {
          ...r.author,
          profileImage: r.author.profileImage
            ? this.filesService.getDownloadUrl(r.author.profileImage)
            : null,
        },
      })),
    };
  }

  async createDoubt(batchId: string, dto: CreateBatchDoubtDto, userId: string) {
    await this.getBatchOrThrow(batchId);
    await this.assertEnrolled(batchId, userId);
    const [created] = await this.db
      .insert(batchDoubts)
      .values({
        batchId,
        askedBy: userId,
        title: dto.title,
        body: dto.body,
        subjectId: dto.subjectId,
        attachments: dto.attachments ?? [],
      })
      .returning();
    return created;
  }

  async updateDoubt(
    batchId: string,
    doubtId: string,
    dto: UpdateBatchDoubtDto,
    userId: string,
    userRole: string
  ) {
    const [existing] = await this.db
      .select()
      .from(batchDoubts)
      .where(
        and(
          eq(batchDoubts.doubtId, doubtId),
          eq(batchDoubts.batchId, batchId),
          eq(batchDoubts.isDeleted, false)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Doubt not found");
    const isAuthor = existing.askedBy === userId;
    const isAdmin = this.isAdmin(userRole);
    if (!isAuthor && !isAdmin) throw new ForbiddenException("Cannot edit this doubt");

    const [updated] = await this.db
      .update(batchDoubts)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.attachments !== undefined && { attachments: dto.attachments }),
        ...(dto.status !== undefined && isAdmin && { status: dto.status }),
        updatedAt: new Date(),
      })
      .where(eq(batchDoubts.doubtId, doubtId))
      .returning();
    return updated;
  }

  async deleteDoubt(
    batchId: string,
    doubtId: string,
    userId: string,
    userRole: string
  ) {
    const [existing] = await this.db
      .select()
      .from(batchDoubts)
      .where(
        and(eq(batchDoubts.doubtId, doubtId), eq(batchDoubts.batchId, batchId))
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Doubt not found");
    if (existing.askedBy !== userId && !this.isAdmin(userRole)) {
      throw new ForbiddenException("Cannot delete this doubt");
    }
    await this.db
      .update(batchDoubts)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchDoubts.doubtId, doubtId));
    return { success: true };
  }

  async addDoubtReply(
    batchId: string,
    doubtId: string,
    dto: CreateDoubtReplyDto,
    userId: string,
    userRole: string
  ) {
    await this.getBatchOrThrow(batchId);
    const [doubt] = await this.db
      .select()
      .from(batchDoubts)
      .where(
        and(
          eq(batchDoubts.doubtId, doubtId),
          eq(batchDoubts.batchId, batchId),
          eq(batchDoubts.isDeleted, false)
        )
      )
      .limit(1);
    if (!doubt) throw new NotFoundException("Doubt not found");
    const isAdmin = this.isAdmin(userRole);
    if (!isAdmin) await this.assertEnrolled(batchId, userId);

    const isOfficial = isAdmin || userRole === "INSTRUCTOR";
    const [reply] = await this.db
      .insert(batchDoubtReplies)
      .values({
        doubtId,
        authorId: userId,
        body: dto.body,
        attachments: dto.attachments ?? [],
        isOfficial,
      })
      .returning();

    await this.db
      .update(batchDoubts)
      .set({
        replyCount: sql`${batchDoubts.replyCount} + 1`,
        status: isOfficial ? "ANSWERED" : doubt.status,
        updatedAt: new Date(),
      })
      .where(eq(batchDoubts.doubtId, doubtId));

    // Notify the doubt author when someone else replies
    if (doubt.askedBy !== userId) {
      const batch = await this.getBatchOrThrow(batchId);
      await this.notificationsService.create({
        userId: doubt.askedBy,
        type: "BATCH_DOUBT_REPLY",
        title: isOfficial
          ? `Your doubt was answered: ${doubt.title}`
          : `New reply on: ${doubt.title}`,
        body: dto.body.slice(0, 200),
        link: `/batches/${batch.slug}/doubts/${doubtId}`,
        batchId,
      });
    }

    return reply;
  }

  async deleteDoubtReply(
    batchId: string,
    doubtId: string,
    replyId: string,
    userId: string,
    userRole: string
  ) {
    const [reply] = await this.db
      .select()
      .from(batchDoubtReplies)
      .where(
        and(
          eq(batchDoubtReplies.replyId, replyId),
          eq(batchDoubtReplies.doubtId, doubtId)
        )
      )
      .limit(1);
    if (!reply) throw new NotFoundException("Reply not found");
    if (reply.authorId !== userId && !this.isAdmin(userRole)) {
      throw new ForbiddenException("Cannot delete this reply");
    }
    await this.db
      .update(batchDoubtReplies)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchDoubtReplies.replyId, replyId));
    return { success: true };
  }

  // ─── Attendance ────────────────────────────────────────────────────────────

  async recordAttendance(
    batchId: string,
    sessionId: string,
    userId: string,
    dto: RecordAttendanceDto
  ) {
    await this.getBatchOrThrow(batchId);
    await this.assertEnrolled(batchId, userId);

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
    if (session.type !== "LIVE") {
      throw new BadRequestException("Attendance only tracked for live sessions");
    }

    const [existing] = await this.db
      .select()
      .from(batchAttendance)
      .where(
        and(
          eq(batchAttendance.sessionId, sessionId),
          eq(batchAttendance.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      if (dto.durationSeconds !== undefined) {
        await this.db
          .update(batchAttendance)
          .set({ durationSeconds: dto.durationSeconds })
          .where(eq(batchAttendance.attendanceId, existing.attendanceId));
      }
      return { success: true, alreadyRecorded: true };
    }

    await this.db.insert(batchAttendance).values({
      batchId,
      sessionId,
      userId,
      durationSeconds: dto.durationSeconds,
    });
    return { success: true, alreadyRecorded: false };
  }

  async listAttendance(batchId: string, sessionId: string) {
    await this.getBatchOrThrow(batchId);
    const rows = await this.db
      .select({
        attendance: batchAttendance,
        user: {
          userId: users.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(batchAttendance)
      .innerJoin(users, eq(batchAttendance.userId, users.userId))
      .where(
        and(
          eq(batchAttendance.batchId, batchId),
          eq(batchAttendance.sessionId, sessionId)
        )
      )
      .orderBy(asc(batchAttendance.joinedAt));

    return rows.map((r) => ({
      ...r.attendance,
      user: {
        ...r.user,
        profileImage: r.user.profileImage
          ? this.filesService.getDownloadUrl(r.user.profileImage)
          : null,
      },
    }));
  }

  // ─── Quizzes ───────────────────────────────────────────────────────────────

  async listQuizzes(
    batchId: string,
    opts: { userId: string; userRole: string }
  ) {
    await this.getBatchOrThrow(batchId);
    const isAdmin = this.isAdmin(opts.userRole);
    if (!isAdmin) await this.assertEnrolled(batchId, opts.userId);

    const conditions = [
      eq(batchQuizzes.batchId, batchId),
      eq(batchQuizzes.isDeleted, false),
    ];
    if (!isAdmin) {
      conditions.push(sql`${batchQuizzes.publishedAt} IS NOT NULL`);
    }

    const quizzes = await this.db
      .select()
      .from(batchQuizzes)
      .where(and(...conditions))
      .orderBy(desc(batchQuizzes.createdAt));

    if (isAdmin) return quizzes;

    // For learners, also fetch their best attempt per quiz
    const userAttempts = await this.db
      .select({
        quizId: batchQuizAttempts.quizId,
        score: batchQuizAttempts.score,
        maxScore: batchQuizAttempts.maxScore,
        submittedAt: batchQuizAttempts.submittedAt,
        status: batchQuizAttempts.status,
      })
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.userId, opts.userId),
          inArray(
            batchQuizAttempts.quizId,
            quizzes.map((q) => q.quizId)
          )
        )
      );

    const attemptByQuiz = new Map<string, { score: number | null; maxScore: number | null; submittedAt: Date | null; status: string }>();
    for (const a of userAttempts) {
      const prev = attemptByQuiz.get(a.quizId);
      const score = a.score ? Number(a.score) : 0;
      if (!prev || score > (prev.score ?? 0)) {
        attemptByQuiz.set(a.quizId, {
          score: a.score ? Number(a.score) : null,
          maxScore: a.maxScore ? Number(a.maxScore) : null,
          submittedAt: a.submittedAt,
          status: a.status,
        });
      }
    }

    return quizzes.map((q) => ({
      ...q,
      myBestAttempt: attemptByQuiz.get(q.quizId) ?? null,
    }));
  }

  async getQuiz(
    batchId: string,
    quizId: string,
    opts: { userId: string; userRole: string; includeAnswers?: boolean }
  ) {
    await this.getBatchOrThrow(batchId);
    const isAdmin = this.isAdmin(opts.userRole);
    if (!isAdmin) await this.assertEnrolled(batchId, opts.userId);

    const [quiz] = await this.db
      .select()
      .from(batchQuizzes)
      .where(
        and(
          eq(batchQuizzes.quizId, quizId),
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizzes.isDeleted, false)
        )
      )
      .limit(1);
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (!isAdmin && !quiz.publishedAt) {
      throw new NotFoundException("Quiz not found");
    }

    const questions = await this.db
      .select()
      .from(batchQuizQuestions)
      .where(
        and(
          eq(batchQuizQuestions.quizId, quizId),
          eq(batchQuizQuestions.isDeleted, false)
        )
      )
      .orderBy(asc(batchQuizQuestions.order));

    // Strip correctAnswer + explanation for learners during attempt
    const safeQuestions =
      isAdmin || opts.includeAnswers
        ? questions
        : questions.map((q) => ({
            ...q,
            correctAnswer: null as unknown,
            explanation: null as string | null,
          }));

    return { ...quiz, questions: safeQuestions };
  }

  async createQuiz(batchId: string, dto: CreateBatchQuizDto, createdBy: string) {
    const batch = await this.getBatchOrThrow(batchId);
    if (dto.opensAt && dto.closesAt && new Date(dto.closesAt) <= new Date(dto.opensAt)) {
      throw new BadRequestException("closesAt must be after opensAt");
    }
    const [created] = await this.db
      .insert(batchQuizzes)
      .values({
        batchId,
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        maxAttempts: dto.maxAttempts,
        negativeMarkPercent: dto.negativeMarkPercent.toString(),
        passingPercent: dto.passingPercent.toString(),
        showLeaderboard: dto.showLeaderboard ?? true,
        showSolutions: dto.showSolutions ?? true,
        opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        publishedAt: dto.publish ? new Date() : null,
        createdBy,
      })
      .returning();
    if (dto.publish) {
      const enrolledIds = await this.getEnrolledUserIds(batchId);
      await this.notificationsService.fanout(enrolledIds, {
        type: "BATCH_QUIZ_PUBLISHED",
        title: `New test: ${dto.title}`,
        body: `${dto.durationMinutes} min · max ${dto.maxAttempts} attempt${dto.maxAttempts === 1 ? "" : "s"}`,
        link: `/batches/${batch.slug}/quizzes/${created.quizId}`,
        batchId,
      });
    }
    return created;
  }

  async updateQuiz(batchId: string, quizId: string, dto: UpdateBatchQuizDto) {
    const [existing] = await this.db
      .select()
      .from(batchQuizzes)
      .where(
        and(
          eq(batchQuizzes.quizId, quizId),
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizzes.isDeleted, false)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Quiz not found");

    const [updated] = await this.db
      .update(batchQuizzes)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.durationMinutes !== undefined && {
          durationMinutes: dto.durationMinutes,
        }),
        ...(dto.maxAttempts !== undefined && { maxAttempts: dto.maxAttempts }),
        ...(dto.negativeMarkPercent !== undefined && {
          negativeMarkPercent: dto.negativeMarkPercent.toString(),
        }),
        ...(dto.passingPercent !== undefined && {
          passingPercent: dto.passingPercent.toString(),
        }),
        ...(dto.showLeaderboard !== undefined && {
          showLeaderboard: dto.showLeaderboard,
        }),
        ...(dto.showSolutions !== undefined && {
          showSolutions: dto.showSolutions,
        }),
        ...(dto.opensAt !== undefined && {
          opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        }),
        ...(dto.closesAt !== undefined && {
          closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        }),
        ...(dto.publish === true &&
          !existing.publishedAt && { publishedAt: new Date() }),
        ...(dto.publish === false && { publishedAt: null }),
        updatedAt: new Date(),
      })
      .where(eq(batchQuizzes.quizId, quizId))
      .returning();
    return updated;
  }

  async deleteQuiz(batchId: string, quizId: string) {
    const [existing] = await this.db
      .select()
      .from(batchQuizzes)
      .where(and(eq(batchQuizzes.quizId, quizId), eq(batchQuizzes.batchId, batchId)))
      .limit(1);
    if (!existing) throw new NotFoundException("Quiz not found");
    await this.db
      .update(batchQuizzes)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchQuizzes.quizId, quizId));
    return { success: true };
  }

  // ─── Quiz questions ─────────────────────────────────────────────────────────

  private async assertQuizForBatch(batchId: string, quizId: string) {
    const [q] = await this.db
      .select()
      .from(batchQuizzes)
      .where(
        and(
          eq(batchQuizzes.quizId, quizId),
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizzes.isDeleted, false)
        )
      )
      .limit(1);
    if (!q) throw new NotFoundException("Quiz not found");
    return q;
  }

  async createQuizQuestion(
    batchId: string,
    quizId: string,
    dto: CreateQuizQuestionDto
  ) {
    await this.assertQuizForBatch(batchId, quizId);
    this.validateQuestionShape(dto);
    const [created] = await this.db
      .insert(batchQuizQuestions)
      .values({
        quizId,
        order: dto.order,
        type: dto.type,
        prompt: dto.prompt,
        options: dto.options ?? [],
        correctAnswer: dto.correctAnswer as never,
        marks: dto.marks.toString(),
        explanation: dto.explanation,
      })
      .returning();
    return created;
  }

  async updateQuizQuestion(
    batchId: string,
    quizId: string,
    questionId: string,
    dto: UpdateQuizQuestionDto
  ) {
    await this.assertQuizForBatch(batchId, quizId);
    const [existing] = await this.db
      .select()
      .from(batchQuizQuestions)
      .where(
        and(
          eq(batchQuizQuestions.questionId, questionId),
          eq(batchQuizQuestions.quizId, quizId),
          eq(batchQuizQuestions.isDeleted, false)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Question not found");

    if (dto.type || dto.correctAnswer !== undefined) {
      this.validateQuestionShape({
        type: dto.type ?? existing.type,
        options: dto.options ?? existing.options,
        correctAnswer:
          dto.correctAnswer !== undefined
            ? dto.correctAnswer
            : (existing.correctAnswer as never),
      });
    }

    const [updated] = await this.db
      .update(batchQuizQuestions)
      .set({
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.prompt !== undefined && { prompt: dto.prompt }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.correctAnswer !== undefined && {
          correctAnswer: dto.correctAnswer as never,
        }),
        ...(dto.marks !== undefined && { marks: dto.marks.toString() }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation }),
        updatedAt: new Date(),
      })
      .where(eq(batchQuizQuestions.questionId, questionId))
      .returning();
    return updated;
  }

  async deleteQuizQuestion(batchId: string, quizId: string, questionId: string) {
    await this.assertQuizForBatch(batchId, quizId);
    await this.db
      .update(batchQuizQuestions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(batchQuizQuestions.questionId, questionId),
          eq(batchQuizQuestions.quizId, quizId)
        )
      );
    return { success: true };
  }

  private validateQuestionShape(q: {
    type: "MCQ_SINGLE" | "MCQ_MULTI" | "NUMERICAL";
    options?: Array<{ id: string; text: string }> | null;
    correctAnswer: unknown;
  }) {
    if (q.type === "MCQ_SINGLE" || q.type === "MCQ_MULTI") {
      if (!q.options || q.options.length < 2) {
        throw new BadRequestException("MCQ questions need at least 2 options");
      }
      const ids = new Set(q.options.map((o) => o.id));
      if (q.type === "MCQ_SINGLE") {
        if (typeof q.correctAnswer !== "string" || !ids.has(q.correctAnswer)) {
          throw new BadRequestException("MCQ_SINGLE correctAnswer must be an option id");
        }
      } else {
        if (
          !Array.isArray(q.correctAnswer) ||
          q.correctAnswer.length === 0 ||
          !q.correctAnswer.every((a) => typeof a === "string" && ids.has(a))
        ) {
          throw new BadRequestException(
            "MCQ_MULTI correctAnswer must be a non-empty array of option ids"
          );
        }
      }
    } else if (q.type === "NUMERICAL") {
      const ca = q.correctAnswer as { value?: unknown; tolerance?: unknown };
      if (
        !ca ||
        typeof ca !== "object" ||
        typeof ca.value !== "number" ||
        (ca.tolerance !== undefined && typeof ca.tolerance !== "number")
      ) {
        throw new BadRequestException(
          "NUMERICAL correctAnswer must be { value: number, tolerance?: number }"
        );
      }
    }
  }

  // ─── Quiz attempts ─────────────────────────────────────────────────────────

  async startQuizAttempt(batchId: string, quizId: string, userId: string) {
    await this.getBatchOrThrow(batchId);
    await this.assertEnrolled(batchId, userId);

    const [quiz] = await this.db
      .select()
      .from(batchQuizzes)
      .where(
        and(
          eq(batchQuizzes.quizId, quizId),
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizzes.isDeleted, false)
        )
      )
      .limit(1);
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (!quiz.publishedAt) throw new BadRequestException("Quiz not published");
    const now = Date.now();
    if (quiz.opensAt && quiz.opensAt.getTime() > now) {
      throw new BadRequestException("Quiz hasn't opened yet");
    }
    if (quiz.closesAt && quiz.closesAt.getTime() < now) {
      throw new BadRequestException("Quiz has closed");
    }

    // Check existing in-progress
    const [inProgress] = await this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, userId),
          eq(batchQuizAttempts.status, "IN_PROGRESS")
        )
      )
      .limit(1);
    if (inProgress) return inProgress;

    // Check max attempts
    const finished = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, userId),
          inArray(batchQuizAttempts.status, ["SUBMITTED", "EXPIRED"])
        )
      );
    if (finished[0].count >= quiz.maxAttempts) {
      throw new BadRequestException("Maximum attempts reached");
    }

    const expiresAt = new Date(Date.now() + quiz.durationMinutes * 60_000);
    const [created] = await this.db
      .insert(batchQuizAttempts)
      .values({
        quizId,
        userId,
        status: "IN_PROGRESS",
        expiresAt,
        answers: {},
      })
      .returning();
    return created;
  }

  async submitQuizAttempt(
    batchId: string,
    quizId: string,
    attemptId: string,
    dto: SubmitQuizAnswerDto,
    userId: string
  ) {
    await this.getBatchOrThrow(batchId);
    await this.assertEnrolled(batchId, userId);

    const [attempt] = await this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.attemptId, attemptId),
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, userId)
        )
      )
      .limit(1);
    if (!attempt) throw new NotFoundException("Attempt not found");
    if (attempt.status !== "IN_PROGRESS") {
      throw new BadRequestException("Attempt already finalized");
    }

    const [quiz] = await this.db
      .select()
      .from(batchQuizzes)
      .where(eq(batchQuizzes.quizId, quizId))
      .limit(1);
    if (!quiz) throw new NotFoundException("Quiz not found");

    const expired = attempt.expiresAt.getTime() < Date.now();
    const finalStatus = expired ? "EXPIRED" : "SUBMITTED";

    const questions = await this.db
      .select()
      .from(batchQuizQuestions)
      .where(
        and(
          eq(batchQuizQuestions.quizId, quizId),
          eq(batchQuizQuestions.isDeleted, false)
        )
      );

    let totalMarks = 0;
    let earnedMarks = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const negativePct = Number(quiz.negativeMarkPercent) / 100;

    for (const q of questions) {
      const qMarks = Number(q.marks);
      totalMarks += qMarks;
      const userAnswer = dto.answers[q.questionId];

      if (userAnswer === undefined || userAnswer === null || userAnswer === "") {
        skippedCount++;
        continue;
      }

      let isCorrect = false;
      if (q.type === "MCQ_SINGLE") {
        isCorrect = userAnswer === q.correctAnswer;
      } else if (q.type === "MCQ_MULTI") {
        if (Array.isArray(userAnswer) && Array.isArray(q.correctAnswer)) {
          const userSet = new Set(userAnswer);
          const correctSet = new Set(q.correctAnswer as string[]);
          isCorrect =
            userSet.size === correctSet.size &&
            [...userSet].every((v) => correctSet.has(v as string));
        }
      } else if (q.type === "NUMERICAL") {
        const ca = q.correctAnswer as { value: number; tolerance?: number };
        const numericAnswer = Number(userAnswer);
        if (!Number.isNaN(numericAnswer)) {
          const tolerance = ca.tolerance ?? 0;
          isCorrect = Math.abs(numericAnswer - ca.value) <= tolerance;
        }
      }

      if (isCorrect) {
        earnedMarks += qMarks;
        correctCount++;
      } else {
        earnedMarks -= qMarks * negativePct;
        wrongCount++;
      }
    }

    earnedMarks = Math.max(0, Number(earnedMarks.toFixed(2)));

    const [updated] = await this.db
      .update(batchQuizAttempts)
      .set({
        status: finalStatus,
        submittedAt: new Date(),
        score: earnedMarks.toString(),
        maxScore: totalMarks.toString(),
        correctCount,
        wrongCount,
        skippedCount,
        answers: dto.answers,
        updatedAt: new Date(),
      })
      .where(eq(batchQuizAttempts.attemptId, attemptId))
      .returning();

    return updated;
  }

  async getAttempt(
    batchId: string,
    quizId: string,
    attemptId: string,
    userId: string,
    userRole: string
  ) {
    await this.getBatchOrThrow(batchId);
    const [attempt] = await this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.attemptId, attemptId),
          eq(batchQuizAttempts.quizId, quizId)
        )
      )
      .limit(1);
    if (!attempt) throw new NotFoundException("Attempt not found");
    if (attempt.userId !== userId && !this.isAdmin(userRole)) {
      throw new ForbiddenException("Not your attempt");
    }
    return attempt;
  }

  async listMyAttempts(batchId: string, quizId: string, userId: string) {
    await this.getBatchOrThrow(batchId);
    await this.assertEnrolled(batchId, userId);
    return this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, userId)
        )
      )
      .orderBy(desc(batchQuizAttempts.startedAt));
  }

  async quizLeaderboard(batchId: string, quizId: string) {
    await this.getBatchOrThrow(batchId);
    const [quiz] = await this.db
      .select()
      .from(batchQuizzes)
      .where(
        and(
          eq(batchQuizzes.quizId, quizId),
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizzes.isDeleted, false)
        )
      )
      .limit(1);
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (!quiz.showLeaderboard) {
      throw new ForbiddenException("Leaderboard disabled for this quiz");
    }

    const rows = await this.db
      .select({
        attempt: batchQuizAttempts,
        user: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(batchQuizAttempts)
      .innerJoin(users, eq(batchQuizAttempts.userId, users.userId))
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.status, "SUBMITTED")
        )
      )
      .orderBy(desc(batchQuizAttempts.score), asc(batchQuizAttempts.submittedAt))
      .limit(50);

    // Keep only best per user
    const seen = new Set<string>();
    const leaderboard: Array<{
      userId: string;
      name: string;
      profileImage: string | null;
      score: number | null;
      maxScore: number | null;
      submittedAt: Date | null;
      rank: number;
    }> = [];
    let rank = 0;
    for (const r of rows) {
      if (seen.has(r.user.userId)) continue;
      seen.add(r.user.userId);
      rank++;
      leaderboard.push({
        userId: r.user.userId,
        name:
          [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") ||
          "Student",
        profileImage: r.user.profileImage
          ? this.filesService.getDownloadUrl(r.user.profileImage)
          : null,
        score: r.attempt.score ? Number(r.attempt.score) : null,
        maxScore: r.attempt.maxScore ? Number(r.attempt.maxScore) : null,
        submittedAt: r.attempt.submittedAt,
        rank,
      });
    }
    return leaderboard;
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  async analytics(batchId: string) {
    await this.getBatchOrThrow(batchId);

    const [
      [{ enrollmentCount }],
      [{ liveCount }],
      [{ recordingCount }],
      [{ resourceCount }],
      [{ doubtCount }],
      [{ openDoubtCount }],
      [{ quizCount }],
      attendanceRows,
      quizAvgRow,
    ] = await Promise.all([
      this.db
        .select({ enrollmentCount: sql<number>`count(*)::int` })
        .from(batchEnrollments)
        .where(
          and(
            eq(batchEnrollments.batchId, batchId),
            eq(batchEnrollments.status, "ACTIVE")
          )
        ),
      this.db
        .select({ liveCount: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "LIVE"),
            eq(batchSessions.isDeleted, false)
          )
        ),
      this.db
        .select({ recordingCount: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "RECORDING"),
            eq(batchSessions.isDeleted, false)
          )
        ),
      this.db
        .select({ resourceCount: sql<number>`count(*)::int` })
        .from(batchResources)
        .where(
          and(
            eq(batchResources.batchId, batchId),
            eq(batchResources.isDeleted, false)
          )
        ),
      this.db
        .select({ doubtCount: sql<number>`count(*)::int` })
        .from(batchDoubts)
        .where(
          and(eq(batchDoubts.batchId, batchId), eq(batchDoubts.isDeleted, false))
        ),
      this.db
        .select({ openDoubtCount: sql<number>`count(*)::int` })
        .from(batchDoubts)
        .where(
          and(
            eq(batchDoubts.batchId, batchId),
            eq(batchDoubts.isDeleted, false),
            eq(batchDoubts.status, "OPEN")
          )
        ),
      this.db
        .select({ quizCount: sql<number>`count(*)::int` })
        .from(batchQuizzes)
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizzes.isDeleted, false)
          )
        ),
      this.db
        .select({
          sessionId: batchAttendance.sessionId,
          attended: sql<number>`count(*)::int`,
        })
        .from(batchAttendance)
        .where(eq(batchAttendance.batchId, batchId))
        .groupBy(batchAttendance.sessionId),
      this.db
        .select({
          avgScore: sql<number>`avg(
            (cast(${batchQuizAttempts.score} as numeric) /
             nullif(cast(${batchQuizAttempts.maxScore} as numeric), 0)) * 100
          )::float`,
        })
        .from(batchQuizAttempts)
        .innerJoin(
          batchQuizzes,
          eq(batchQuizAttempts.quizId, batchQuizzes.quizId)
        )
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizAttempts.status, "SUBMITTED")
          )
        ),
    ]);

    const totalLive = liveCount;
    const totalAttendanceEvents = attendanceRows.reduce(
      (s, r) => s + Number(r.attended),
      0
    );
    const avgAttendancePerSession =
      totalLive > 0 && enrollmentCount > 0
        ? (totalAttendanceEvents / (totalLive * enrollmentCount)) * 100
        : 0;

    return {
      enrollmentCount,
      liveSessions: liveCount,
      recordings: recordingCount,
      resources: resourceCount,
      doubts: doubtCount,
      openDoubts: openDoubtCount,
      quizzes: quizCount,
      avgAttendancePercent: Number(avgAttendancePerSession.toFixed(1)),
      avgQuizScorePercent:
        quizAvgRow.length > 0 && quizAvgRow[0].avgScore != null
          ? Number(quizAvgRow[0].avgScore.toFixed(1))
          : null,
    };
  }

  async myDashboard(userId: string) {
    const myBatches = await this.findMine(userId);
    const batchIds = myBatches.map((b) => b.batchId);

    if (batchIds.length === 0) {
      return {
        batches: myBatches,
        upcomingLive: [],
        openQuizzes: [],
        recentAnnouncements: [],
        myCertificates: [],
      };
    }

    const [upcomingLive, openQuizzes, recentAnnouncements, myCertificates] =
      await Promise.all([
            this.db
              .select({
                session: batchSessions,
                batch: {
                  batchId: batches.batchId,
                  title: batches.title,
                  slug: batches.slug,
                },
              })
              .from(batchSessions)
              .innerJoin(batches, eq(batchSessions.batchId, batches.batchId))
              .where(
                and(
                  inArray(batchSessions.batchId, batchIds),
                  eq(batchSessions.type, "LIVE"),
                  eq(batchSessions.isDeleted, false),
                  sql`${batchSessions.scheduledStartAt} >= now() - interval '15 minutes'`
                )
              )
              .orderBy(asc(batchSessions.scheduledStartAt))
              .limit(10),
            this.db
              .select({
                quiz: batchQuizzes,
                batch: {
                  batchId: batches.batchId,
                  title: batches.title,
                  slug: batches.slug,
                },
              })
              .from(batchQuizzes)
              .innerJoin(batches, eq(batchQuizzes.batchId, batches.batchId))
              .where(
                and(
                  inArray(batchQuizzes.batchId, batchIds),
                  eq(batchQuizzes.isDeleted, false),
                  sql`${batchQuizzes.publishedAt} IS NOT NULL`,
                  or(
                    sql`${batchQuizzes.closesAt} IS NULL`,
                    sql`${batchQuizzes.closesAt} >= now()`
                  )
                )
              )
              .orderBy(desc(batchQuizzes.createdAt))
              .limit(10),
            this.db
              .select({
                announcement: batchAnnouncements,
                batch: {
                  batchId: batches.batchId,
                  title: batches.title,
                  slug: batches.slug,
                },
              })
              .from(batchAnnouncements)
              .innerJoin(batches, eq(batchAnnouncements.batchId, batches.batchId))
              .where(
                and(
                  inArray(batchAnnouncements.batchId, batchIds),
                  eq(batchAnnouncements.isDeleted, false)
                )
              )
              .orderBy(desc(batchAnnouncements.createdAt))
              .limit(10),
            this.db
              .select({
                cert: batchCertificates,
                batch: {
                  batchId: batches.batchId,
                  title: batches.title,
                  slug: batches.slug,
                },
              })
              .from(batchCertificates)
              .innerJoin(batches, eq(batchCertificates.batchId, batches.batchId))
              .where(
                and(
                  eq(batchCertificates.userId, userId),
                  sql`${batchCertificates.revokedAt} IS NULL`
                )
              )
              .limit(10),
          ] as const);

    return {
      batches: myBatches,
      upcomingLive: upcomingLive.map((r) => ({
        ...r.session,
        batch: r.batch,
      })),
      openQuizzes: openQuizzes.map((r) => ({
        ...r.quiz,
        batch: r.batch,
      })),
      recentAnnouncements: recentAnnouncements.map((r) => ({
        ...r.announcement,
        batch: r.batch,
      })),
      myCertificates,
    };
  }

  async myProgress(batchId: string, userId: string) {
    await this.getBatchOrThrow(batchId);
    await this.assertEnrolled(batchId, userId);

    const [
      [{ liveTotal }],
      [{ attended }],
      [{ recordingTotal }],
      [{ quizTotal }],
      myAttempts,
    ] = await Promise.all([
      this.db
        .select({ liveTotal: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "LIVE"),
            eq(batchSessions.isDeleted, false)
          )
        ),
      this.db
        .select({ attended: sql<number>`count(*)::int` })
        .from(batchAttendance)
        .where(
          and(
            eq(batchAttendance.batchId, batchId),
            eq(batchAttendance.userId, userId)
          )
        ),
      this.db
        .select({ recordingTotal: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "RECORDING"),
            eq(batchSessions.isDeleted, false)
          )
        ),
      this.db
        .select({ quizTotal: sql<number>`count(*)::int` })
        .from(batchQuizzes)
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizzes.isDeleted, false),
            sql`${batchQuizzes.publishedAt} IS NOT NULL`
          )
        ),
      this.db
        .select({
          quizId: batchQuizAttempts.quizId,
          score: batchQuizAttempts.score,
          maxScore: batchQuizAttempts.maxScore,
        })
        .from(batchQuizAttempts)
        .innerJoin(
          batchQuizzes,
          eq(batchQuizAttempts.quizId, batchQuizzes.quizId)
        )
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizAttempts.userId, userId),
            eq(batchQuizAttempts.status, "SUBMITTED")
          )
        ),
    ]);

    const bestByQuiz = new Map<string, { score: number; max: number }>();
    for (const a of myAttempts) {
      const score = a.score ? Number(a.score) : 0;
      const max = a.maxScore ? Number(a.maxScore) : 0;
      const prev = bestByQuiz.get(a.quizId);
      if (!prev || score > prev.score) bestByQuiz.set(a.quizId, { score, max });
    }
    const quizzesAttempted = bestByQuiz.size;
    const totalScore = [...bestByQuiz.values()].reduce((s, v) => s + v.score, 0);
    const totalMax = [...bestByQuiz.values()].reduce((s, v) => s + v.max, 0);
    const avgPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : null;

    return {
      sessions: {
        liveTotal,
        attended,
        attendancePercent:
          liveTotal > 0 ? Number(((attended / liveTotal) * 100).toFixed(1)) : 0,
        recordings: recordingTotal,
      },
      quizzes: {
        total: quizTotal,
        attempted: quizzesAttempted,
        averageScorePercent: avgPercent != null ? Number(avgPercent.toFixed(1)) : null,
      },
    };
  }
}
