import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { batchEnrollments, retentionCohortRows } from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";

const COHORT_JOB = "retention-cohorts.compute";
const COHORT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function monthDiff(cohortMonth: string, now: Date): number {
  const [cy, cm] = cohortMonth.split("-").map(Number);
  return (now.getFullYear() - cy) * 12 + (now.getMonth() + 1 - cm);
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {
    registerAndRepeat(
      jobs,
      COHORT_JOB,
      () => this.computeCohorts(),
      COHORT_INTERVAL_MS,
      (err) => this.logger.error("Failed to schedule retention-cohorts.compute", err),
    );
  }

  async getRetention() {
    return this.db.select().from(retentionCohortRows);
  }

  async computeCohorts(): Promise<void> {
    const now = this.clock.now();

    const cohorts = await this.db
      .select({
        cohortMonth: sql<string>`to_char(date_trunc('month', ${batchEnrollments.createdAt}), 'YYYY-MM')`,
        source: batchEnrollments.source,
        activeCount: sql<number>`count(distinct ${batchEnrollments.userId})::int`,
      })
      .from(batchEnrollments)
      .where(eq(batchEnrollments.status, "ACTIVE"))
      .groupBy(
        sql`date_trunc('month', ${batchEnrollments.createdAt})`,
        batchEnrollments.source,
      );

    for (const cohort of cohorts) {
      const offset = monthDiff(cohort.cohortMonth, now);
      if (offset < 0) continue;

      await this.db.insert(retentionCohortRows).values({
        cohortMonth: cohort.cohortMonth,
        source: cohort.source ?? null,
        periodOffset: offset,
        activeCount: cohort.activeCount,
        computedAt: now,
      });
    }
  }
}
