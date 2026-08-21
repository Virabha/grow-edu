import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchAttendance,
  batchCertificates,
  batchDoubts,
  batchEnrollments,
  batchQuizAttempts,
  batchQuizzes,
  batchWaitlist,
  batches,
  lessonProgress,
} from "../../database/schema";
import { Transaction } from "../../database/transaction";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService, SignedInViewer } from "../access/batch-access.service";
import { TransferStudentDto } from "../dto/transfer-student.dto";

export const DESTINATION_FULL = "DESTINATION_FULL";

interface CarryOver {
  carried: string[];
  leftBehind: string[];
}

const WHAT_MOVES: CarryOver = {
  carried: ["enrolment", "access window", "how the place was paid for"],
  leftBehind: [
    "attendance",
    "lesson progress",
    "quiz attempts",
    "doubts and their replies",
    "certificates",
  ],
};

@Injectable()
export class TransferService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async preview(fromBatchId: string, userId: string, toBatchId: string) {
    const [from, to] = await Promise.all([
      this.access.requireBatch(fromBatchId),
      this.access.requireBatch(toBatchId),
    ]);
    const enrolment = await this.activeEnrolment(this.db, fromBatchId, userId);
    if (!enrolment) {
      throw new NotFoundException("That student is not enrolled in this batch");
    }

    const leaving = await this.countsFor(fromBatchId, userId);
    const room = await this.roomIn(this.db, toBatchId);

    return {
      userId,
      from: { batchId: from.batchId, title: from.title },
      to: { batchId: to.batchId, title: to.title },
      ...WHAT_MOVES,
      leavingBehind: leaving,
      destinationHasRoom: room.free === null || room.free > 0,
      destinationFreePlaces: room.free,
      willJoinWaitlist: room.free !== null && room.free <= 0,
    };
  }

  async transfer(
    fromBatchId: string,
    userId: string,
    dto: TransferStudentDto,
    actor: SignedInViewer,
  ) {
    if (fromBatchId === dto.toBatchId) {
      throw new BadRequestException(
        "The student is already in that batch, so there is nothing to move",
      );
    }
    await this.access.requireBatch(fromBatchId);
    await this.access.requireBatch(dto.toBatchId);

    const result = await this.db.transaction(async (tx) => {
      await this.lockBatch(tx, fromBatchId);
      await this.lockBatch(tx, dto.toBatchId);

      const enrolment = await this.activeEnrolment(tx, fromBatchId, userId);
      if (!enrolment) {
        throw new NotFoundException(
          "That student is not enrolled in this batch",
        );
      }

      const already = await this.activeEnrolment(tx, dto.toBatchId, userId);
      if (already) {
        throw new ConflictException(
          "That student is already enrolled in the destination batch",
        );
      }

      const room = await this.roomIn(tx, dto.toBatchId);
      const full = room.free !== null && room.free <= 0;

      if (full && dto.waitlistIfFull !== true) {
        throw new ConflictException({
          code: DESTINATION_FULL,
          message:
            "The destination batch is full. Repeat with waitlistIfFull to queue the student instead.",
          freePlaces: 0,
        });
      }

      const now = this.clock.now();

      await tx
        .update(batchEnrollments)
        .set({ status: "REVOKED", updatedAt: now })
        .where(eq(batchEnrollments.enrollmentId, enrolment.enrollmentId));

      if (full) {
        await tx
          .insert(batchWaitlist)
          .values({
            batchId: dto.toBatchId,
            userId,
            joinedAt: now,
            paymentId: enrolment.paymentId,
          })
          .onConflictDoUpdate({
            target: [batchWaitlist.batchId, batchWaitlist.userId],
            set: { status: "WAITING", joinedAt: now, resolvedAt: null },
          });
        return { waitlisted: true };
      }

      await tx
        .insert(batchEnrollments)
        .values({
          batchId: dto.toBatchId,
          userId,
          status: "ACTIVE",
          source: enrolment.source,
          accessEndsAt: enrolment.accessEndsAt,
          paymentId: enrolment.paymentId,
          grantedBy: actor.userId,
        })
        .onConflictDoUpdate({
          target: [batchEnrollments.batchId, batchEnrollments.userId],
          set: {
            status: "ACTIVE",
            source: enrolment.source,
            accessEndsAt: enrolment.accessEndsAt,
            paymentId: enrolment.paymentId,
            grantedBy: actor.userId,
            updatedAt: now,
          },
        });

      return { waitlisted: false };
    });

    const [destination] = await this.db
      .select({ title: batches.title, slug: batches.slug })
      .from(batches)
      .where(eq(batches.batchId, dto.toBatchId))
      .limit(1);

    await this.auditLog.record({
      action: "enrolment.transfer",
      targetType: "user",
      targetId: userId,
      before: { batchId: fromBatchId },
      after: {
        batchId: dto.toBatchId,
        waitlisted: result.waitlisted,
        reason: dto.reason ?? null,
        ...WHAT_MOVES,
      },
    });

    await this.notifications.queuedFanout(
      [userId],
      "BATCH_ENROLLMENT",
      {
        title: result.waitlisted
          ? `You were moved to the waitlist for ${destination?.title ?? "another batch"}`
          : `You were moved to ${destination?.title ?? "another batch"}`,
        body:
          dto.reason ??
          "Your place was moved by the team. Your attendance and progress stay with the old batch.",
      },
      `/batches/${destination?.slug ?? dto.toBatchId}`,
      dto.toBatchId,
    );

    return {
      userId,
      fromBatchId,
      toBatchId: dto.toBatchId,
      waitlisted: result.waitlisted,
      ...WHAT_MOVES,
    };
  }

  private async lockBatch(tx: Transaction, batchId: string): Promise<void> {
    const locked = await tx.execute<{ batch_id: string }>(
      sql`select batch_id from batches
          where batch_id = ${batchId} and is_deleted = false
          for update`,
    );
    if (!locked[0]) throw new NotFoundException("Batch not found");
  }

  private async activeEnrolment(
    tx: Transaction | PostgresJsDatabase<typeof schema>,
    batchId: string,
    userId: string,
  ) {
    const [row] = await tx
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async roomIn(
    tx: Transaction | PostgresJsDatabase<typeof schema>,
    batchId: string,
  ): Promise<{ capacity: number | null; free: number | null }> {
    const [batch] = await tx
      .select({ capacity: batches.capacity })
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    if (!batch) throw new NotFoundException("Batch not found");
    if (batch.capacity === null) return { capacity: null, free: null };

    const [taken] = await tx
      .select({ active: sql<number>`count(*)::int` })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );

    return {
      capacity: batch.capacity,
      free: Math.max(batch.capacity - Number(taken?.active ?? 0), 0),
    };
  }

  private async countsFor(batchId: string, userId: string) {
    const [attendance, progress, attempts, doubts, certificates] =
      await Promise.all([
        this.count(
          this.db
            .select({ total: sql<number>`count(*)::int` })
            .from(batchAttendance)
            .where(
              and(
                eq(batchAttendance.batchId, batchId),
                eq(batchAttendance.userId, userId),
              ),
            ),
        ),
        this.count(
          this.db
            .select({ total: sql<number>`count(*)::int` })
            .from(lessonProgress)
            .where(
              and(
                eq(lessonProgress.batchId, batchId),
                eq(lessonProgress.userId, userId),
              ),
            ),
        ),
        this.count(
          this.db
            .select({ total: sql<number>`count(*)::int` })
            .from(batchQuizAttempts)
            .innerJoin(
              batchQuizzes,
              eq(batchQuizzes.quizId, batchQuizAttempts.quizId),
            )
            .where(
              and(
                eq(batchQuizzes.batchId, batchId),
                eq(batchQuizAttempts.userId, userId),
              ),
            ),
        ),
        this.count(
          this.db
            .select({ total: sql<number>`count(*)::int` })
            .from(batchDoubts)
            .where(
              and(
                eq(batchDoubts.batchId, batchId),
                eq(batchDoubts.askedBy, userId),
              ),
            ),
        ),
        this.count(
          this.db
            .select({ total: sql<number>`count(*)::int` })
            .from(batchCertificates)
            .where(
              and(
                eq(batchCertificates.batchId, batchId),
                eq(batchCertificates.userId, userId),
              ),
            ),
        ),
      ]);
    return { attendance, progress, attempts, doubts, certificates };
  }

  private async count(
    query: Promise<{ total: number }[]>,
  ): Promise<number> {
    const [row] = await query;
    return Number(row?.total ?? 0);
  }
}
