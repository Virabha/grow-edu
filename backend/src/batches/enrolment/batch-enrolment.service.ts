import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchEnrollments,
  batches,
  lessonProgress,
  payments,
  users,
} from "../../database/schema";
import { Queryable } from "../../database/transaction";
import { NotificationsService } from "../../notifications/notifications.service";
import { PaymentService } from "../../payment/payment.service";
import {
  BatchAccessService,
  SignedInViewer,
} from "../access/batch-access.service";
import { BatchMediaService } from "../batch-media.service";
import { CreateBatchEnrollmentsDto } from "../dto/batch-enrollment.dto";
import { RecordLessonProgressDto } from "../dto/lesson-progress.dto";
import { WaitlistService } from "./waitlist.service";
import { BatchCapacityService } from "../access/batch-capacity.service";

const MAX_PAGE_LIMIT = 100;

type EnrolmentSource = (typeof batchEnrollments.$inferInsert)["source"];

@Injectable()
export class BatchEnrolmentService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly media: BatchMediaService,
    private readonly notifications: NotificationsService,
    private readonly paymentService: PaymentService,
    private readonly waitlist: WaitlistService,
    private readonly capacity: BatchCapacityService,
  ) {}

  onModuleInit(): void {
    this.paymentService.registerBatchEnrollHandler(
      async (batchId, userId, paymentId, tx) => {
        await this.grant(batchId, userId, {
          source: "SELF_PURCHASE",
          paymentId,
          tx,
        });
      },
    );
    this.paymentService.registerBatchEnrolledNotifier((batchId, userId) =>
      this.announceEnrolment(batchId, userId),
    );
  }

  async announceEnrolment(batchId: string, userId: string): Promise<void> {
    const [batch] = await this.db
      .select({ title: batches.title, slug: batches.slug })
      .from(batches)
      .where(eq(batches.batchId, batchId))
      .limit(1);
    if (!batch) return;

    await this.notifications.create({
      userId,
      type: "BATCH_ENROLLMENT",
      title: `You're enrolled in ${batch.title}`,
      link: `/batches/${batch.slug}`,
      batchId,
    });
  }

  async findMine(userId: string) {
    const rows = await this.db
      .select({ batch: batches, enrollment: batchEnrollments })
      .from(batchEnrollments)
      .innerJoin(batches, eq(batchEnrollments.batchId, batches.batchId))
      .where(
        and(
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
          eq(batches.isDeleted, false),
        ),
      )
      .orderBy(desc(batches.startDate));

    return rows.map((r) => ({
      ...r.batch,
      thumbnail: this.media.url(r.batch.thumbnail),
      bannerImage: this.media.url(r.batch.bannerImage),
      price: Number(r.batch.price),
      compareAtPrice:
        r.batch.compareAtPrice == null ? null : Number(r.batch.compareAtPrice),
      enrollment: {
        enrollmentId: r.enrollment.enrollmentId,
        status: r.enrollment.status,
        source: r.enrollment.source,
        accessStartsAt: r.enrollment.accessStartsAt,
        accessEndsAt: r.enrollment.accessEndsAt,
      },
    }));
  }

  async startCheckout(batchId: string, userId: string) {
    const batch = await this.access.requireBatch(batchId);
    if (batch.status !== "UPCOMING" && batch.status !== "ONGOING") {
      throw new BadRequestException("Batch is not open for enrollment");
    }
    if (await this.access.isEnrolled(batchId, userId)) {
      throw new BadRequestException("Already enrolled in this batch");
    }

    if (!(await this.capacity.hasRoom(batchId))) {
      const place = await this.waitlist.join(batchId, { userId });
      return {
        paymentId: null as string | null,
        enrolled: false,
        waitlisted: true,
        position: place.position,
        originalAmount: Number(batch.price),
        discountAmount: 0,
        finalAmount: Number(batch.price),
      };
    }

    const originalAmount = Number(batch.price);

    if (originalAmount === 0) {
      const enrollment = await this.grant(batchId, userId, { source: "FREE" });
      await this.announceEnrolment(batchId, userId);
      return {
        paymentId: null as string | null,
        enrolled: true,
        enrollment,
        originalAmount,
        discountAmount: 0,
        finalAmount: 0,
      };
    }

    const [existingPending] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.batchId, batchId),
          inArray(payments.status, ["PENDING", "PROOF_UPLOADED"]),
        ),
      )
      .limit(1);

    if (existingPending) {
      return {
        paymentId: existingPending.paymentId as string | null,
        enrolled: false,
        enrollment: undefined,
        originalAmount,
        discountAmount: Number(existingPending.discountAmount ?? 0),
        finalAmount: Number(existingPending.amount),
        reused: true,
      };
    }

    const [payment] = await this.db
      .insert(payments)
      .values({
        userId,
        batchId,
        itemType: "BATCH",
        amount: originalAmount.toString(),
        originalAmount: originalAmount.toString(),
        currency: batch.currency,
        gateway: "MANUAL_QR",
        status: "PENDING",
        metadata: { batchTitle: batch.title, batchSlug: batch.slug },
      })
      .returning();

    return {
      paymentId: payment.paymentId as string | null,
      enrolled: false,
      enrollment: undefined,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
    };
  }

  async list(
    batchId: string,
    opts: { page?: number; limit?: number; search?: string },
  ) {
    await this.access.requireBatch(batchId);
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(batchEnrollments.batchId, batchId),
      eq(batchEnrollments.status, "ACTIVE"),
    ];
    if (opts.search) {
      const pattern = `%${opts.search}%`;
      const searchCondition = or(
        ilike(users.email, pattern),
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
      );
      if (searchCondition) conditions.push(searchCondition);
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
          profileImage: this.media.url(r.user.profileImage),
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

  async addMany(
    batchId: string,
    dto: CreateBatchEnrollmentsDto,
    grantedBy: string,
  ) {
    const batch = await this.access.requireBatch(batchId);

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
          inArray(batchEnrollments.userId, targetUserIds),
        ),
      );
    const existingSet = new Set(existing.map((e) => e.userId));
    const newUserIds = targetUserIds.filter((id) => !existingSet.has(id));

    if (newUserIds.length === 0) {
      return {
        enrolled: 0,
        alreadyEnrolled: targetUserIds.length,
        notFoundEmails,
      };
    }

    await this.assertRoomFor(batchId, batch.capacity, newUserIds.length);

    const accessEndsAt = dto.accessEndsAt ? new Date(dto.accessEndsAt) : null;
    await this.db.insert(batchEnrollments).values(
      newUserIds.map((userId) => ({
        batchId,
        userId,
        status: "ACTIVE" as const,
        source: "ADMIN_GRANT" as const,
        accessEndsAt,
        grantedBy,
      })),
    );

    for (const userId of newUserIds) {
      await this.announceEnrolment(batchId, userId);
    }

    return {
      enrolled: newUserIds.length,
      alreadyEnrolled: existingSet.size,
      notFoundEmails,
    };
  }

  async grant(
    batchId: string,
    userId: string,
    opts: {
      source: EnrolmentSource;
      paymentId?: string;
      grantedBy?: string;
      accessEndsAt?: Date | null;
      tx?: Queryable;
    },
  ) {
    const db = opts.tx ?? this.db;
    const [batch] = await db
      .select()
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    if (!batch) throw new NotFoundException("Batch not found");

    const [existing] = await db
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.status === "ACTIVE") return existing;
      const [revived] = await db
        .update(batchEnrollments)
        .set({
          status: "ACTIVE",
          source: opts.source,
          paymentId: opts.paymentId ?? existing.paymentId,
          grantedBy: opts.grantedBy ?? existing.grantedBy,
          updatedAt: new Date(),
        })
        .where(eq(batchEnrollments.enrollmentId, existing.enrollmentId))
        .returning();
      return revived;
    }

    if (batch.capacity != null) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(batchEnrollments)
        .where(
          and(
            eq(batchEnrollments.batchId, batchId),
            eq(batchEnrollments.status, "ACTIVE"),
          ),
        );
      if (count >= batch.capacity) {
        throw new BadRequestException("Batch is full");
      }
    }

    const [created] = await db
      .insert(batchEnrollments)
      .values({
        batchId,
        userId,
        status: "ACTIVE",
        source: opts.source,
        accessEndsAt: opts.accessEndsAt ?? null,
        paymentId: opts.paymentId,
        grantedBy: opts.grantedBy,
      })
      .returning();

    return created;
  }

  async recordLessonProgress(
    batchId: string,
    lessonId: string,
    viewer: SignedInViewer,
    dto: RecordLessonProgressDto,
  ) {
    await this.access.requireForLesson(lessonId, viewer, "READ", batchId);
    const userId = viewer.userId;
    const now = new Date();

    const [row] = await this.db
      .insert(lessonProgress)
      .values({
        userId,
        lessonId,
        batchId,
        completed: dto.completed ?? false,
        timeSpent: dto.timeSpent ?? 0,
        lastPosition: dto.lastPosition,
        lastAccessed: now,
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          ...(dto.completed !== undefined && { completed: dto.completed }),
          ...(dto.timeSpent !== undefined && {
            timeSpent: sql`${lessonProgress.timeSpent} + ${dto.timeSpent}`,
          }),
          ...(dto.lastPosition !== undefined && {
            lastPosition: dto.lastPosition,
          }),
          lastAccessed: now,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }

  async lessonProgressFor(batchId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "READ");
    return this.db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.batchId, batchId),
          eq(lessonProgress.userId, viewer.userId),
        ),
      );
  }

  async revoke(batchId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Enrollment not found");
    await this.db
      .update(batchEnrollments)
      .set({ status: "REVOKED", updatedAt: new Date() })
      .where(eq(batchEnrollments.enrollmentId, existing.enrollmentId));

    const promoted = await this.waitlist.promoteNext(batchId, (tx, nextUserId) =>
      this.grantIn(tx, batchId, nextUserId),
    );

    return { success: true, promoted: promoted?.userId ?? null };
  }

  async grantIn(
    tx: Queryable,
    batchId: string,
    userId: string,
  ): Promise<void> {
    await this.grant(batchId, userId, {
      source: "ADMIN_GRANT",
      tx,
    });
  }


  private async assertRoomFor(
    batchId: string,
    capacity: number | null,
    wanted: number,
  ): Promise<void> {
    if (capacity == null) return;
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );
    const available = capacity - count;
    if (available <= 0) throw new BadRequestException("Batch is full");
    if (wanted > available) {
      throw new BadRequestException(
        `Batch capacity would be exceeded: ${available} slot(s) remaining, tried to enrol ${wanted}`,
      );
    }
  }
}
