import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, eq, gte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchRecurrenceSeries, batchSessions } from "../../database/schema";
import { JOB_QUEUE, JobQueue } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService } from "../access/batch-access.service";
import { CreateRecurrenceSeriesDto } from "../dto/create-recurrence-series.dto";
import { RescheduleSessionDto } from "../dto/reschedule-session.dto";

const GENERATE_JOB = "batch.recurrence.generate";
const REPEAT_INTERVAL_MS = 60 * 60 * 1000;

type Series = typeof batchRecurrenceSeries.$inferSelect;

interface Occurrence {
  startAt: Date;
  endAt: Date;
  occurrenceIndex: number;
}

@Injectable()
export class RecurrenceService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    this.jobs.register(GENERATE_JOB, async () => {
      const now = this.clock.now();
      const allSeries = await this.db
        .select()
        .from(batchRecurrenceSeries)
        .where(eq(batchRecurrenceSeries.isDeleted, false));
      for (const series of allSeries) {
        await this.generateForSeries(series, now);
      }
    });
    void this.jobs.repeat(GENERATE_JOB, REPEAT_INTERVAL_MS);
  }

  async create(
    batchId: string,
    dto: CreateRecurrenceSeriesDto,
    actorId: string,
  ): Promise<Series> {
    await this.access.requireBatch(batchId);

    const [series] = await this.db
      .insert(batchRecurrenceSeries)
      .values({
        batchId,
        title: dto.title,
        subjectId: dto.subjectId ?? null,
        teacherId: dto.teacherId ?? null,
        liveProvider: dto.liveProvider,
        joinUrl: dto.joinUrl ?? null,
        daysOfWeek: dto.daysOfWeek,
        startTimeUtc: dto.startTimeUtc,
        durationMinutes: dto.durationMinutes,
        windowStartAt: new Date(dto.windowStartAt),
        windowEndAt: dto.windowEndAt ? new Date(dto.windowEndAt) : null,
        lookAheadDays: dto.lookAheadDays ?? 28,
        createdBy: actorId,
      })
      .returning();

    await this.generateForSeries(series, this.clock.now());

    await this.auditLog.record({
      action: "batch.recurrence.created",
      targetType: "batchRecurrenceSeries",
      targetId: series.seriesId,
      after: {
        batchId,
        title: dto.title,
        daysOfWeek: dto.daysOfWeek,
        startTimeUtc: dto.startTimeUtc,
      },
    });

    return series;
  }

  async list(batchId: string): Promise<Series[]> {
    return this.db
      .select()
      .from(batchRecurrenceSeries)
      .where(
        and(
          eq(batchRecurrenceSeries.batchId, batchId),
          eq(batchRecurrenceSeries.isDeleted, false),
        ),
      );
  }

  async deleteSeries(
    batchId: string,
    seriesId: string,
  ): Promise<{ success: boolean }> {
    const [series] = await this.db
      .select()
      .from(batchRecurrenceSeries)
      .where(
        and(
          eq(batchRecurrenceSeries.seriesId, seriesId),
          eq(batchRecurrenceSeries.batchId, batchId),
          eq(batchRecurrenceSeries.isDeleted, false),
        ),
      )
      .limit(1);

    if (!series) throw new NotFoundException("Recurrence series not found");

    const now = this.clock.now();

    await this.db
      .update(batchRecurrenceSeries)
      .set({ isDeleted: true, updatedAt: now })
      .where(eq(batchRecurrenceSeries.seriesId, seriesId));

    await this.db
      .update(batchSessions)
      .set({ isDeleted: true, updatedAt: now })
      .where(
        and(
          eq(batchSessions.seriesId, seriesId),
          eq(batchSessions.isDeleted, false),
          gte(batchSessions.scheduledStartAt, now),
        ),
      );

    await this.auditLog.record({
      action: "batch.recurrence.deleted",
      targetType: "batchRecurrenceSeries",
      targetId: seriesId,
    });

    return { success: true };
  }

  async reschedule(
    batchId: string,
    sessionId: string,
    dto: RescheduleSessionDto,
  ): Promise<typeof batchSessions.$inferSelect> {
    const session = await this.requireSession(batchId, sessionId);

    if (session.type !== "LIVE") {
      throw new BadRequestException("Only LIVE sessions can be rescheduled");
    }

    const newStart = new Date(dto.scheduledStartAt);
    const newEnd = new Date(dto.scheduledEndAt);

    if (newEnd <= newStart) {
      throw new BadRequestException(
        "scheduledEndAt must be after scheduledStartAt",
      );
    }

    const before = {
      scheduledStartAt: session.scheduledStartAt
        ? session.scheduledStartAt.toISOString()
        : null,
      scheduledEndAt: session.scheduledEndAt
        ? session.scheduledEndAt.toISOString()
        : null,
    };

    const [updated] = await this.db
      .update(batchSessions)
      .set({
        scheduledStartAt: newStart,
        scheduledEndAt: newEnd,
        updatedAt: this.clock.now(),
      })
      .where(eq(batchSessions.sessionId, sessionId))
      .returning();

    await this.auditLog.record({
      action: "session.rescheduled",
      targetType: "batchSession",
      targetId: sessionId,
      before,
      after: {
        scheduledStartAt: dto.scheduledStartAt,
        scheduledEndAt: dto.scheduledEndAt,
      },
    });

    const enrolledIds = await this.access.enrolledUserIds(batchId);
    await this.notifications.queuedFanout(
      enrolledIds,
      "GENERIC",
      {
        title: `Class rescheduled: ${session.title}`,
        body: `New time: ${dto.scheduledStartAt}`,
      },
      `/batches/${batchId}?tab=schedule`,
      batchId,
      `reschedule:${sessionId}:${dto.scheduledStartAt}`,
    );

    return updated;
  }

  async cancel(
    batchId: string,
    sessionId: string,
  ): Promise<{ success: boolean }> {
    const session = await this.requireSession(batchId, sessionId);

    if (session.type !== "LIVE") {
      throw new BadRequestException("Only LIVE sessions can be cancelled");
    }

    const now = this.clock.now();

    await this.db
      .update(batchSessions)
      .set({ status: "CANCELLED", updatedAt: now })
      .where(eq(batchSessions.sessionId, sessionId));

    await this.auditLog.record({
      action: "session.cancelled",
      targetType: "batchSession",
      targetId: sessionId,
      before: { status: session.status },
      after: { status: "CANCELLED" },
    });

    const enrolledIds = await this.access.enrolledUserIds(batchId);
    await this.notifications.queuedFanout(
      enrolledIds,
      "GENERIC",
      {
        title: `Class cancelled: ${session.title}`,
        body: "The class has been cancelled.",
      },
      `/batches/${batchId}?tab=schedule`,
      batchId,
      `cancel:${sessionId}`,
    );

    return { success: true };
  }

  private async generateForSeries(series: Series, now: Date): Promise<void> {
    const lookAheadMs = series.lookAheadDays * 24 * 60 * 60 * 1000;
    const windowEnd = new Date(now.getTime() + lookAheadMs);
    const effectiveEnd =
      series.windowEndAt !== null && series.windowEndAt < windowEnd
        ? series.windowEndAt
        : windowEnd;

    const windowStart =
      series.windowStartAt > now ? series.windowStartAt : now;

    if (windowStart >= effectiveEnd) return;

    const existingRows = await this.db
      .select({ occurrenceIndex: batchSessions.occurrenceIndex })
      .from(batchSessions)
      .where(eq(batchSessions.seriesId, series.seriesId));

    const existingIndices = new Set<number>(
      existingRows
        .map((r) => r.occurrenceIndex)
        .filter((i): i is number => i !== null),
    );

    const occurrences = this.computeOccurrences(series, windowStart, effectiveEnd);

    for (const occ of occurrences) {
      if (!existingIndices.has(occ.occurrenceIndex)) {
        await this.db.insert(batchSessions).values({
          batchId: series.batchId,
          seriesId: series.seriesId,
          occurrenceIndex: occ.occurrenceIndex,
          title: series.title,
          subjectId: series.subjectId,
          teacherId: series.teacherId,
          type: "LIVE",
          liveProvider: series.liveProvider,
          joinUrl: series.joinUrl,
          scheduledStartAt: occ.startAt,
          scheduledEndAt: occ.endAt,
          status: "SCHEDULED",
        });
      }
    }
  }

  private computeOccurrences(
    series: Series,
    windowStart: Date,
    windowEnd: Date,
  ): Occurrence[] {
    const results: Occurrence[] = [];

    const parts = series.startTimeUtc.split(":");
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    const cursor = new Date(windowStart);
    cursor.setUTCHours(0, 0, 0, 0);

    while (cursor < windowEnd) {
      const dayOfWeek = cursor.getUTCDay();

      if (series.daysOfWeek.includes(dayOfWeek)) {
        const startAt = new Date(cursor);
        startAt.setUTCHours(hours, minutes, 0, 0);

        if (startAt >= windowStart && startAt < windowEnd) {
          const endAt = new Date(
            startAt.getTime() + series.durationMinutes * 60 * 1000,
          );
          results.push({
            startAt,
            endAt,
            occurrenceIndex: Math.floor(cursor.getTime() / 86400000),
          });
        }
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return results;
  }

  private async requireSession(
    batchId: string,
    sessionId: string,
  ): Promise<typeof batchSessions.$inferSelect> {
    const [session] = await this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.sessionId, sessionId),
          eq(batchSessions.batchId, batchId),
          eq(batchSessions.isDeleted, false),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException("Session not found");
    return session;
  }
}
