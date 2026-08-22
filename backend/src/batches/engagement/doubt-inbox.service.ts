import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchDoubtReplies,
  batchDoubts,
  batchInstructors,
  batches,
  users,
} from "../../database/schema";
import { NotificationsService } from "../../notifications/notifications.service";
import {
  DEFAULT_DOUBT_RESPONSE_TARGET_HOURS,
  DOUBTS_SETTINGS_GROUP,
} from "../../settings/settings.definitions";
import { SettingsService } from "../../settings/settings.service";
import { BatchAccessService, SignedInViewer } from "../access/batch-access.service";
import { AssignDoubtDto, PromoteDoubtDto } from "../dto/doubt-inbox.dto";

const MILLIS_PER_HOUR = 3_600_000;

export interface InboxEntry {
  doubtId: string;
  batchId: string;
  batchTitle: string;
  batchSlug: string;
  title: string;
  body: string;
  anchorType: "BATCH" | "LESSON" | "QUESTION";
  anchorId: string | null;
  askedAt: string;
  waitingHours: number;
  targetHours: number;
  isOverdue: boolean;
  assignedTo: string | null;
}

@Injectable()
export class DoubtInboxService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async inbox(viewer: SignedInViewer): Promise<InboxEntry[]> {
    const batchIds = await this.batchesFor(viewer);
    if (batchIds.length === 0) return [];

    const targetHours = await this.responseTargetHours();
    const now = this.clock.now();

    const rows = await this.db
      .select({ doubt: batchDoubts, batch: batches })
      .from(batchDoubts)
      .innerJoin(batches, eq(batchDoubts.batchId, batches.batchId))
      .where(
        and(
          inArray(batchDoubts.batchId, batchIds),
          eq(batchDoubts.isDeleted, false),
          eq(batchDoubts.status, "OPEN"),
        ),
      )
      .orderBy(asc(batchDoubts.createdAt));

    return rows.map(({ doubt, batch }) => {
      const waitingHours =
        (now.getTime() - doubt.createdAt.getTime()) / MILLIS_PER_HOUR;
      return {
        doubtId: doubt.doubtId,
        batchId: doubt.batchId,
        batchTitle: batch.title,
        batchSlug: batch.slug,
        title: doubt.title,
        body: doubt.body,
        anchorType: doubt.anchorType,
        anchorId: doubt.anchorId,
        askedAt: doubt.createdAt.toISOString(),
        waitingHours: Math.round(waitingHours * 100) / 100,
        targetHours,
        isOverdue: waitingHours > targetHours,
        assignedTo: doubt.assignedTo,
      };
    });
  }

  async assign(
    batchId: string,
    doubtId: string,
    dto: AssignDoubtDto,
    viewer: SignedInViewer,
  ) {
    await this.access.require(batchId, viewer, "MANAGE");
    const doubt = await this.requireDoubt(batchId, doubtId);

    const [instructor] = await this.db
      .select({ instructorId: batchInstructors.instructorId })
      .from(batchInstructors)
      .where(
        and(
          eq(batchInstructors.batchId, batchId),
          eq(batchInstructors.instructorId, dto.instructorId),
        ),
      )
      .limit(1);

    if (!instructor) {
      throw new BadRequestException(
        "That person does not teach this batch, so the doubt cannot be sent to them",
      );
    }

    const now = this.clock.now();
    const [updated] = await this.db
      .update(batchDoubts)
      .set({
        assignedTo: dto.instructorId,
        assignedAt: now,
        assignedBy: viewer.userId,
        updatedAt: now,
      })
      .where(eq(batchDoubts.doubtId, doubtId))
      .returning();

    await this.auditLog.record({
      action: "doubt.assign",
      targetType: "batch_doubt",
      targetId: doubtId,
      before: { assignedTo: doubt.assignedTo },
      after: { assignedTo: dto.instructorId, batchId },
    });

    if (dto.instructorId !== viewer.userId) {
      await this.notifications.create({
        userId: dto.instructorId,
        type: "BATCH_DOUBT_REPLY",
        title: `A doubt was sent to you: ${doubt.title}`,
        body: doubt.body.slice(0, 200),
        link: `/instructor/doubts`,
        batchId,
      });
    }

    return updated;
  }

  async promote(
    batchId: string,
    doubtId: string,
    dto: PromoteDoubtDto,
    viewer: SignedInViewer,
  ) {
    const { batch } = await this.access.require(batchId, viewer, "MANAGE");
    const doubt = await this.requireDoubt(batchId, doubtId);

    if (doubt.status === "OPEN") {
      throw new BadRequestException(
        "Answer the doubt before promoting it to the batch",
      );
    }

    const [reply] = await this.db
      .select()
      .from(batchDoubtReplies)
      .where(
        and(
          eq(batchDoubtReplies.replyId, dto.replyId),
          eq(batchDoubtReplies.doubtId, doubtId),
          eq(batchDoubtReplies.isDeleted, false),
        ),
      )
      .limit(1);

    if (!reply) {
      throw new NotFoundException("That answer is not on this doubt");
    }

    const now = this.clock.now();
    const [updated] = await this.db
      .update(batchDoubts)
      .set({
        promotedReplyId: dto.replyId,
        promotedAt: now,
        promotedBy: viewer.userId,
        updatedAt: now,
      })
      .where(eq(batchDoubts.doubtId, doubtId))
      .returning();

    await this.auditLog.record({
      action: "doubt.promote",
      targetType: "batch_doubt",
      targetId: doubtId,
      after: {
        batchId,
        replyId: dto.replyId,
        notifiedBatch: dto.notifyBatch === true,
      },
    });

    if (dto.notifyBatch === true) {
      await this.notifications.queuedFanout(
        await this.access.enrolledUserIds(batchId),
        "BATCH_ANNOUNCEMENT",
        {
          title: `Answered for everyone: ${doubt.title}`,
          body: reply.body.slice(0, 200),
        },
        `/batches/${batch.slug}/answers`,
        batchId,
        `doubt-promoted:${doubtId}`,
      );
    }

    return this.presentPromoted(updated, reply.body, reply.authorId);
  }

  async unpromote(batchId: string, doubtId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "MANAGE");
    await this.requireDoubt(batchId, doubtId);

    const [updated] = await this.db
      .update(batchDoubts)
      .set({
        promotedReplyId: null,
        promotedAt: null,
        promotedBy: null,
        updatedAt: this.clock.now(),
      })
      .where(eq(batchDoubts.doubtId, doubtId))
      .returning({ doubtId: batchDoubts.doubtId });

    await this.auditLog.record({
      action: "doubt.unpromote",
      targetType: "batch_doubt",
      targetId: doubtId,
      after: { batchId },
    });

    return { doubtId: updated.doubtId, promoted: false };
  }

  async listPromoted(batchId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "READ");

    const rows = await this.db
      .select({ doubt: batchDoubts, reply: batchDoubtReplies })
      .from(batchDoubts)
      .innerJoin(
        batchDoubtReplies,
        eq(batchDoubts.promotedReplyId, batchDoubtReplies.replyId),
      )
      .where(
        and(
          eq(batchDoubts.batchId, batchId),
          eq(batchDoubts.isDeleted, false),
          isNotNull(batchDoubts.promotedAt),
        ),
      )
      .orderBy(asc(batchDoubts.promotedAt));

    const askerIds = rows
      .filter((r) => r.doubt.consentToAttribution)
      .map((r) => r.doubt.askedBy);
    const askerNames = await this.namesFor(askerIds);

    return rows.map((r) =>
      this.presentPromoted(
        r.doubt,
        r.reply.body,
        r.reply.authorId,
        askerNames.get(r.doubt.askedBy) ?? null,
      ),
    );
  }

  private presentPromoted(
    doubt: typeof batchDoubts.$inferSelect,
    answer: string,
    answeredBy: string,
    askerName: string | null = null,
  ) {
    return {
      doubtId: doubt.doubtId,
      batchId: doubt.batchId,
      question: doubt.title,
      detail: doubt.body,
      answer,
      answeredBy,
      subjectId: doubt.subjectId,
      anchorType: doubt.anchorType,
      anchorId: doubt.anchorId,
      promotedAt: doubt.promotedAt ? doubt.promotedAt.toISOString() : null,
      askedBy: doubt.consentToAttribution ? doubt.askedBy : null,
      askedByName: doubt.consentToAttribution ? askerName : null,
    };
  }

  private async namesFor(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.userId, [...new Set(userIds)]));

    return new Map(
      rows.map((r) => {
        const name = [r.firstName, r.lastName].filter(Boolean).join(" ");
        return [r.userId, name.length > 0 ? name : r.email];
      }),
    );
  }

  private async batchesFor(viewer: SignedInViewer): Promise<string[]> {
    if (viewer.role === "PLATFORM_ADMIN") {
      const all = await this.db
        .select({ batchId: batches.batchId })
        .from(batches)
        .where(ne(batches.status, "ARCHIVED"));
      return all.map((b) => b.batchId);
    }

    const mine = await this.db
      .select({ batchId: batchInstructors.batchId })
      .from(batchInstructors)
      .where(eq(batchInstructors.instructorId, viewer.userId));
    return mine.map((b) => b.batchId);
  }

  private async responseTargetHours(): Promise<number> {
    const group = await this.settings.getGroup(DOUBTS_SETTINGS_GROUP);
    const configured = Number(group.values.responseTargetHours);
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_DOUBT_RESPONSE_TARGET_HOURS;
  }

  private async requireDoubt(batchId: string, doubtId: string) {
    const [doubt] = await this.db
      .select()
      .from(batchDoubts)
      .where(
        and(
          eq(batchDoubts.doubtId, doubtId),
          eq(batchDoubts.batchId, batchId),
          eq(batchDoubts.isDeleted, false),
        ),
      )
      .limit(1);
    if (!doubt) throw new NotFoundException("Doubt not found");
    return doubt;
  }
}
