import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { batchEnrollments, retentionCohortRows, users } from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { ViewerContext } from "./report-builder.service";

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

  async getRetention(viewer: ViewerContext) {
    if (viewer.role === "CORPORATE_ADMIN") {
      const [adminRow] = await this.db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.userId, viewer.userId))
        .limit(1);

      if (!adminRow?.companyId) {
        throw new ForbiddenException("Corporate admin has no company");
      }

      return this.db
        .select()
        .from(retentionCohortRows)
        .where(eq(retentionCohortRows.companyId, adminRow.companyId));
    }

    return this.db.select().from(retentionCohortRows);
  }

  async computeCohorts(): Promise<void> {
    const now = this.clock.now();

    const cohorts = await this.db
      .select({
        cohortMonth: sql<string>`to_char(date_trunc('month', ${batchEnrollments.createdAt}), 'YYYY-MM')`,
        source: batchEnrollments.source,
        companyId: users.companyId,
        activeCount: sql<number>`count(distinct ${batchEnrollments.userId})::int`,
      })
      .from(batchEnrollments)
      .leftJoin(users, eq(users.userId, batchEnrollments.userId))
      .where(eq(batchEnrollments.status, "ACTIVE"))
      .groupBy(
        sql`date_trunc('month', ${batchEnrollments.createdAt})`,
        batchEnrollments.source,
        users.companyId,
      );

    const newRows = cohorts.flatMap((cohort) => {
      const offset = monthDiff(cohort.cohortMonth, now);
      if (offset < 0) return [];
      return [
        {
          cohortMonth: cohort.cohortMonth,
          source: cohort.source ?? null,
          companyId: cohort.companyId ?? null,
          periodOffset: offset,
          activeCount: cohort.activeCount,
          computedAt: now,
        },
      ];
    });

    await this.db.transaction(async (tx) => {
      await tx.delete(retentionCohortRows);
      for (const row of newRows) {
        await tx.insert(retentionCohortRows).values(row);
      }
    });
  }
}
