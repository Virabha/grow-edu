import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchEnrollments, batchWaitlist, batches } from "../../database/schema";
import { Transaction } from "../../database/transaction";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService, SignedInViewer } from "../access/batch-access.service";

export const BATCH_FULL = "BATCH_FULL";
export const ALREADY_WAITING = "ALREADY_WAITING";
export const ALREADY_ENROLLED = "ALREADY_ENROLLED";

export interface WaitlistPlace {
  waitlistId: string;
  batchId: string;
  userId: string;
  status: "WAITING" | "PROMOTED" | "WITHDRAWN";
  position: number | null;
  joinedAt: string;
}

interface Capacity {
  capacity: number | null;
  active: number;
  free: number | null;
}

@Injectable()
export class WaitlistService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async join(batchId: string, viewer: SignedInViewer): Promise<WaitlistPlace> {
    const place = await this.db.transaction(async (tx) => {
      await this.lockBatch(tx, batchId);
      await this.refuseIfEnrolled(tx, batchId, viewer.userId);

      const room = await this.capacityIn(tx, batchId);
      if (room.free === null || room.free > 0) {
        throw new BadRequestException({
          code: "BATCH_HAS_ROOM",
          message: "This batch still has places, so enrol rather than waiting.",
        });
      }

      const [existing] = await tx
        .select()
        .from(batchWaitlist)
        .where(
          and(
            eq(batchWaitlist.batchId, batchId),
            eq(batchWaitlist.userId, viewer.userId),
          ),
        )
        .limit(1);

      if (existing && existing.status === "WAITING") {
        throw new ConflictException({
          code: ALREADY_WAITING,
          message: "You are already on the waitlist for this batch.",
        });
      }

      const joinedAt = this.clock.now();
      if (existing) {
        const [revived] = await tx
          .update(batchWaitlist)
          .set({ status: "WAITING", joinedAt, resolvedAt: null })
          .where(eq(batchWaitlist.waitlistId, existing.waitlistId))
          .returning();
        return revived;
      }

      const [created] = await tx
        .insert(batchWaitlist)
        .values({ batchId, userId: viewer.userId, joinedAt })
        .returning();
      return created;
    });

    await this.auditLog.record({
      action: "waitlist.join",
      targetType: "batch",
      targetId: batchId,
      after: { userId: viewer.userId, waitlistId: place.waitlistId },
    });

    return this.present(place, await this.positionOf(place));
  }

  async leave(batchId: string, viewer: SignedInViewer) {
    const [withdrawn] = await this.db
      .update(batchWaitlist)
      .set({ status: "WITHDRAWN", resolvedAt: this.clock.now() })
      .where(
        and(
          eq(batchWaitlist.batchId, batchId),
          eq(batchWaitlist.userId, viewer.userId),
          eq(batchWaitlist.status, "WAITING"),
        ),
      )
      .returning({ waitlistId: batchWaitlist.waitlistId });

    if (!withdrawn) {
      throw new NotFoundException("You are not on the waitlist for this batch");
    }

    await this.auditLog.record({
      action: "waitlist.leave",
      targetType: "batch",
      targetId: batchId,
      after: { userId: viewer.userId },
    });

    return { batchId, waiting: false };
  }

  async myPlace(batchId: string, viewer: SignedInViewer) {
    await this.access.requireBatch(batchId);
    const [place] = await this.db
      .select()
      .from(batchWaitlist)
      .where(
        and(
          eq(batchWaitlist.batchId, batchId),
          eq(batchWaitlist.userId, viewer.userId),
        ),
      )
      .limit(1);

    if (!place) return { batchId, waiting: false, position: null };

    const position =
      place.status === "WAITING" ? await this.positionOf(place) : null;
    return {
      batchId,
      waiting: place.status === "WAITING",
      position,
      status: place.status,
      joinedAt: place.joinedAt.toISOString(),
    };
  }

  async list(batchId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "MANAGE");
    const rows = await this.db
      .select()
      .from(batchWaitlist)
      .where(
        and(
          eq(batchWaitlist.batchId, batchId),
          eq(batchWaitlist.status, "WAITING"),
        ),
      )
      .orderBy(asc(batchWaitlist.joinedAt));

    return rows.map((row, index) => this.present(row, index + 1));
  }

  async capacityOf(batchId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "MANAGE");
    const room = await this.capacityIn(this.db, batchId);
    const [waiting] = await this.db
      .select({ waiting: sql<number>`count(*)::int` })
      .from(batchWaitlist)
      .where(
        and(
          eq(batchWaitlist.batchId, batchId),
          eq(batchWaitlist.status, "WAITING"),
        ),
      );
    return { ...room, waiting: Number(waiting?.waiting ?? 0) };
  }

  async hasRoom(tx: Transaction, batchId: string): Promise<boolean> {
    const room = await this.capacityIn(tx, batchId);
    return room.free === null || room.free > 0;
  }

  async promoteNext(
    batchId: string,
    grant: (tx: Transaction, userId: string) => Promise<void>,
  ): Promise<{ userId: string; waitlistId: string } | null> {
    const promoted = await this.db.transaction(async (tx) => {
      await this.lockBatch(tx, batchId);

      if (!(await this.hasRoom(tx, batchId))) return null;

      const next = await tx.execute<{ waitlist_id: string; user_id: string }>(
        sql`select waitlist_id, user_id from batch_waitlist
            where batch_id = ${batchId} and status = 'WAITING'
            order by joined_at asc
            limit 1
            for update`,
      );
      const candidate = next[0];
      if (!candidate) return null;

      await tx
        .update(batchWaitlist)
        .set({ status: "PROMOTED", resolvedAt: this.clock.now() })
        .where(eq(batchWaitlist.waitlistId, candidate.waitlist_id));

      await grant(tx, candidate.user_id);

      return {
        userId: candidate.user_id,
        waitlistId: candidate.waitlist_id,
      };
    });

    if (!promoted) return null;

    const [batch] = await this.db
      .select({ title: batches.title, slug: batches.slug })
      .from(batches)
      .where(eq(batches.batchId, batchId))
      .limit(1);

    await this.notifications.queuedFanout(
      [promoted.userId],
      "BATCH_ENROLLMENT",
      {
        title: `A place opened up: ${batch?.title ?? "your batch"}`,
        body: "You were on the waitlist and you are now enrolled.",
      },
      `/batches/${batch?.slug ?? batchId}`,
      batchId,
      `waitlist-promoted:${promoted.waitlistId}`,
    );

    await this.auditLog.record({
      action: "waitlist.promote",
      targetType: "batch",
      targetId: batchId,
      after: { userId: promoted.userId, waitlistId: promoted.waitlistId },
    });

    return promoted;
  }

  private async lockBatch(tx: Transaction, batchId: string): Promise<void> {
    const locked = await tx.execute<{ batch_id: string }>(
      sql`select batch_id from batches
          where batch_id = ${batchId} and is_deleted = false
          for update`,
    );
    if (!locked[0]) throw new NotFoundException("Batch not found");
  }

  private async refuseIfEnrolled(
    tx: Transaction,
    batchId: string,
    userId: string,
  ): Promise<void> {
    const [enrolled] = await tx
      .select({ enrollmentId: batchEnrollments.enrollmentId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);
    if (enrolled) {
      throw new ConflictException({
        code: ALREADY_ENROLLED,
        message: "You are already enrolled in this batch.",
      });
    }
  }

  private async capacityIn(
    tx: Transaction | PostgresJsDatabase<typeof schema>,
    batchId: string,
  ): Promise<Capacity> {
    const [batch] = await tx
      .select({ capacity: batches.capacity })
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    if (!batch) throw new NotFoundException("Batch not found");

    const [taken] = await tx
      .select({ active: sql<number>`count(*)::int` })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );

    const active = Number(taken?.active ?? 0);
    return {
      capacity: batch.capacity,
      active,
      free: batch.capacity === null ? null : Math.max(batch.capacity - active, 0),
    };
  }

  private async positionOf(
    place: typeof batchWaitlist.$inferSelect,
  ): Promise<number> {
    const [ahead] = await this.db
      .select({ ahead: sql<number>`count(*)::int` })
      .from(batchWaitlist)
      .where(
        and(
          eq(batchWaitlist.batchId, place.batchId),
          eq(batchWaitlist.status, "WAITING"),
          sql`${batchWaitlist.joinedAt} < ${place.joinedAt}`,
        ),
      );
    return Number(ahead?.ahead ?? 0) + 1;
  }

  private present(
    row: typeof batchWaitlist.$inferSelect,
    position: number | null,
  ): WaitlistPlace {
    return {
      waitlistId: row.waitlistId,
      batchId: row.batchId,
      userId: row.userId,
      status: row.status,
      position,
      joinedAt: row.joinedAt.toISOString(),
    };
  }
}
