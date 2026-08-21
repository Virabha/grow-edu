import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, gt, inArray, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batches } from "../../database/schema";
import { JOB_QUEUE, JobQueue } from "../../jobs/job-queue";

export const BATCH_LIFECYCLE_JOB = "batch.lifecycle.advance";

const EVERY_FIFTEEN_MINUTES = 15 * 60 * 1000;

const MOVEABLE = ["UPCOMING", "ONGOING"] as const;

@Injectable()
export class BatchLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(BatchLifecycleService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly auditLog: AuditLogService,
  ) {}

  onModuleInit(): void {
    this.jobs.register(BATCH_LIFECYCLE_JOB, async () => {
      await this.advance();
    });
    this.jobs
      .repeat(BATCH_LIFECYCLE_JOB, EVERY_FIFTEEN_MINUTES)
      .catch((err) =>
        this.logger.error("Could not schedule batch lifecycle advance", err),
      );
  }

  async advance(): Promise<{ started: string[]; completed: string[] }> {
    const now = this.clock.now();

    const completed = await this.db
      .update(batches)
      .set({ status: "COMPLETED", updatedAt: now })
      .where(
        and(
          inArray(batches.status, [...MOVEABLE]),
          lte(batches.endDate, now),
          eq(batches.isDeleted, false),
        ),
      )
      .returning({ batchId: batches.batchId });

    const started = await this.db
      .update(batches)
      .set({ status: "ONGOING", updatedAt: now })
      .where(
        and(
          eq(batches.status, "UPCOMING"),
          lte(batches.startDate, now),
          gt(batches.endDate, now),
          eq(batches.isDeleted, false),
        ),
      )
      .returning({ batchId: batches.batchId });

    for (const batch of started) {
      await this.auditLog.record({
        action: "batch.lifecycle.started",
        targetType: "batch",
        targetId: batch.batchId,
        after: { status: "ONGOING", at: now.toISOString() },
      });
    }
    for (const batch of completed) {
      await this.auditLog.record({
        action: "batch.lifecycle.completed",
        targetType: "batch",
        targetId: batch.batchId,
        after: { status: "COMPLETED", at: now.toISOString() },
      });
    }

    return {
      started: started.map((b) => b.batchId),
      completed: completed.map((b) => b.batchId),
    };
  }
}
