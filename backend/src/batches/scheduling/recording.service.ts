import { Inject, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { and, eq, isNull, lte, ne } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchAttendance, batchSessions } from "../../database/schema";
import { JOB_QUEUE, JobQueue } from "../../jobs/job-queue";
import { AttachRecordingDto } from "../dto/attach-recording.dto";

export const RECORDING_RECONCILE_JOB = "batch.recording.reconcile";
const REPEAT_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class RecordingService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly auditLog: AuditLogService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    this.jobs.register(
      RECORDING_RECONCILE_JOB,
      async () => {
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

        for (const session of sessions) {
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
      },
      { attempts: 3 },
    );
    void this.jobs.repeat(RECORDING_RECONCILE_JOB, REPEAT_INTERVAL_MS);
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
