import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchSessions } from "../../database/schema";
import { JOB_QUEUE, JobQueue } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { SettingsService } from "../../settings/settings.service";
import { BatchAccessService } from "../access/batch-access.service";

export const SESSION_REMINDER_JOB = "batch.session.reminder";
const REPEAT_INTERVAL_MS = 60 * 1000;

@Injectable()
export class ReminderService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    this.jobs.register(SESSION_REMINDER_JOB, async () => {
      const now = this.clock.now();
      const leadMs = (await this.leadMinutes()) * 60 * 1000;
      const windowEnd = new Date(now.getTime() + leadMs);

      const sessions = await this.db
        .select()
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.type, "LIVE"),
            ne(batchSessions.status, "CANCELLED"),
            eq(batchSessions.isDeleted, false),
            gte(batchSessions.scheduledStartAt, now),
            lte(batchSessions.scheduledStartAt, windowEnd),
          ),
        );

      for (const session of sessions) {
        if (!session.scheduledStartAt) continue;
        const startIso = session.scheduledStartAt.toISOString();
        const fanoutId = `reminder:${session.sessionId}:${startIso}`;
        const enrolledIds = await this.access.enrolledUserIds(session.batchId);
        if (enrolledIds.length === 0) continue;
        await this.notifications.queuedFanout(
          enrolledIds,
          "GENERIC",
          {
            title: `Class starting soon: ${session.title}`,
            body: `Your live class starts soon.`,
          },
          `/batches/${session.batchId}?tab=schedule`,
          session.batchId,
          fanoutId,
        );
      }
    });
    void this.jobs.repeat(SESSION_REMINDER_JOB, REPEAT_INTERVAL_MS);
  }

  private async leadMinutes(): Promise<number> {
    const group = await this.settings.getGroup("liveSession");
    const v = group.values["reminderLeadMinutes"];
    return typeof v === "number" ? v : 15;
  }
}
