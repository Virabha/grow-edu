import { Inject, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { and, eq, isNull, lte, ne } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchAttendance, batchSessions } from "../../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../../jobs/job-queue";
import { AttachRecordingDto } from "../dto/attach-recording.dto";
import { RECORDING_PROVIDER, RecordingProvider } from "./recording-provider";

export const RECORDING_RECONCILE_JOB = "batch.recording.reconcile";
const REPEAT_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class RecordingService implements OnModuleInit {
  private readonly logger = new Logger(RecordingService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly auditLog: AuditLogService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    @Inject(RECORDING_PROVIDER) private readonly provider: RecordingProvider,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      RECORDING_RECONCILE_JOB,
      async () => {
        await this.reconcile();
      },
      REPEAT_INTERVAL_MS,
      (err) =>
        this.logger.error(
          `Could not schedule ${RECORDING_RECONCILE_JOB}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
    );
  }

  async reconcile(): Promise<{ polled: number; attached: number }> {
    const now = this.clock.now();
    const sessions = await this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.type, "LIVE"),
          eq(batchSessions.isDeleted, false),
          ne(batchSessions.status, "CANCELLED"),
          isNull(batchSessions.recordingVideoId),
          lte(batchSessions.scheduledEndAt, now),
        ),
      );

    let attached = 0;

    for (const session of sessions) {
      const batchId = session.batchId;
      if (!batchId) continue;
      const found = await this.pollFor({ ...session, batchId } as typeof batchSessions.$inferSelect & { batchId: string });

      if (found) {
        await this.attachRecording(batchId, session.sessionId, {
          videoId: found.videoId,
          thumbnailUrl: found.thumbnailUrl ?? undefined,
          durationSeconds: found.durationSeconds ?? undefined,
          attendeeUserIds: found.attendeeUserIds,
        });
        attached += 1;
        continue;
      }

      await this.auditLog.record({
        action: "session.recording.pending",
        targetType: "batchSession",
        targetId: session.sessionId,
        after: {
          batchId: session.batchId,
          scheduledEndAt: session.scheduledEndAt
            ? session.scheduledEndAt.toISOString()
            : null,
        },
      });
    }

    return { polled: sessions.length, attached };
  }

  private async pollFor(session: typeof batchSessions.$inferSelect & { batchId: string }) {
    try {
      return await this.provider.findRecording({
        sessionId: session.sessionId,
        batchId: session.batchId,
        liveProvider: session.liveProvider,
        joinUrl: session.joinUrl,
        scheduledEndAt: session.scheduledEndAt,
      });
    } catch (err) {
      this.logger.warn(
        `Recording lookup for ${session.sessionId} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  async attachRecording(
    batchId: string,
    sessionId: string,
    dto: AttachRecordingDto,
  ): Promise<{ success: boolean; alreadyAttached: boolean }> {
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

    if (session.recordingVideoId === dto.videoId) {
      return { success: true, alreadyAttached: true };
    }

    const now = this.clock.now();

    await this.db
      .update(batchSessions)
      .set({
        recordingVideoId: dto.videoId,
        recordingThumbnail: dto.thumbnailUrl ?? null,
        recordingDurationSeconds: dto.durationSeconds ?? null,
        status: "ENDED",
        updatedAt: now,
      })
      .where(eq(batchSessions.sessionId, sessionId));

    if (dto.attendeeUserIds && dto.attendeeUserIds.length > 0) {
      for (const userId of dto.attendeeUserIds) {
        await this.db
          .insert(batchAttendance)
          .values({
            batchId,
            sessionId,
            userId,
            source: "PROVIDER",
            joinedAt: now,
          })
          .onConflictDoNothing();
      }
    }

    await this.auditLog.record({
      action: "session.recording.attached",
      targetType: "batchSession",
      targetId: sessionId,
      after: { videoId: dto.videoId, batchId },
    });

    return { success: true, alreadyAttached: false };
  }
}
