import { Inject, Injectable, Logger } from "@nestjs/common";
import { lt } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { funnelEvents } from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";

const EVENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PRUNE_JOB = "funnel-events.prune";

@Injectable()
export class EventCaptureService {
  private readonly logger = new Logger(EventCaptureService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {
    registerAndRepeat(
      jobs,
      PRUNE_JOB,
      () => this.pruneOldEvents(),
      PRUNE_INTERVAL_MS,
      (err) => this.logger.error("Failed to schedule funnel-events.prune", err),
    );
  }

  async capture(event: {
    kind: "PAGE_VIEW" | "CATALOGUE_VIEW" | "CHECKOUT_START" | "CHECKOUT_COMPLETE";
    batchId?: string;
    source?: string;
    sessionKey?: string;
    userId?: string;
  }): Promise<void> {
    try {
      await this.db.insert(funnelEvents).values({
        kind: event.kind,
        batchId: event.batchId ?? null,
        source: event.source ?? null,
        sessionKey: event.sessionKey ?? null,
        userId: event.userId ?? null,
        capturedAt: this.clock.now(),
      });
    } catch (err) {
      this.logger.warn("Dropped malformed funnel event", err);
    }
  }

  private async pruneOldEvents(): Promise<void> {
    const cutoff = new Date(this.clock.epochMillis() - EVENT_RETENTION_MS);
    await this.db
      .delete(funnelEvents)
      .where(lt(funnelEvents.capturedAt, cutoff));
  }
}
