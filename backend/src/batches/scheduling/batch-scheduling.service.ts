import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchAttendance,
  batchSessions,
  users,
} from "../../database/schema";
import { CdnService } from "../../cdn/cdn.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService, SignedInViewer, Viewer } from "../access/batch-access.service";
import { BatchMediaService } from "../batch-media.service";
import { RecordAttendanceDto } from "../dto/batch-attendance.dto";
import {
  CreateBatchSessionDto,
  UpdateBatchSessionDto,
} from "../dto/batch-session.dto";

@Injectable()
export class BatchSchedulingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly media: BatchMediaService,
    private readonly cdn: CdnService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    batchId: string,
    viewer: Viewer,
    type?: "LIVE" | "RECORDING",
  ) {
    await this.access.require(batchId, viewer, "READ");

    const conditions = [
      eq(batchSessions.batchId, batchId),
      eq(batchSessions.isDeleted, false),
    ];
    if (type) conditions.push(eq(batchSessions.type, type));

    const sessions = await this.db
      .select()
      .from(batchSessions)
      .where(and(...conditions))
      .orderBy(
        desc(
          sql`coalesce(${batchSessions.scheduledStartAt}, ${batchSessions.createdAt})`,
        ),
      );

    return sessions.map((s) => ({
      ...s,
      recordingThumbnail: this.media.url(s.recordingThumbnail),
    }));
  }

  async getWithPlayback(batchId: string, sessionId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, "READ");
    const session = await this.requireSession(batchId, sessionId);

    let playbackUrl: string | null = null;
    if (session.recordingVideoId) {
      try {
        playbackUrl = this.cdn.getSignedEmbedUrl(session.recordingVideoId);
      } catch {
        playbackUrl = null;
      }
    }

    return {
      ...session,
      recordingThumbnail: this.media.url(session.recordingThumbnail),
      playbackUrl,
    };
  }

  async create(batchId: string, dto: CreateBatchSessionDto) {
    const batch = await this.access.requireBatch(batchId);
    this.validateSessionShape(dto);

    if (dto.type === "LIVE" && batch.deliveryMode === "RECORDED") {
      throw new BadRequestException(
        "This batch is recorded-only. Change its delivery mode to schedule live classes.",
      );
    }

    const [created] = await this.db
      .insert(batchSessions)
      .values({
        batchId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        liveProvider: dto.liveProvider,
        joinUrl: dto.joinUrl,
        meetingId: dto.meetingId,
        meetingPasscode: dto.meetingPasscode,
        scheduledStartAt: dto.scheduledStartAt
          ? new Date(dto.scheduledStartAt)
          : null,
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
        status: dto.type === "LIVE" ? "SCHEDULED" : "ENDED",
        recordingVideoId: dto.recordingVideoId,
        recordingDurationSeconds: dto.recordingDurationSeconds,
        recordingThumbnail: dto.recordingThumbnail,
        resources: dto.resources,
      })
      .returning();

    const enrolledIds = await this.access.enrolledUserIds(batchId);
    await this.notifications.fanout(
      enrolledIds,
      dto.type === "LIVE"
        ? {
            type: "BATCH_SESSION_SCHEDULED",
            title: `New live class: ${dto.title}`,
            body: dto.scheduledStartAt
              ? `Scheduled for ${new Date(dto.scheduledStartAt).toLocaleString()}`
              : undefined,
            link: `/batches/${batch.slug}?tab=schedule`,
            batchId,
          }
        : {
            type: "BATCH_RESOURCE_ADDED",
            title: `New recording: ${dto.title}`,
            link: `/batches/${batch.slug}?tab=recordings`,
            batchId,
          },
    );

    return created;
  }

  async update(
    batchId: string,
    sessionId: string,
    dto: UpdateBatchSessionDto,
  ) {
    await this.requireSession(batchId, sessionId);

    const [updated] = await this.db
      .update(batchSessions)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
        ...(dto.liveProvider !== undefined && {
          liveProvider: dto.liveProvider,
        }),
        ...(dto.joinUrl !== undefined && { joinUrl: dto.joinUrl }),
        ...(dto.meetingId !== undefined && { meetingId: dto.meetingId }),
        ...(dto.meetingPasscode !== undefined && {
          meetingPasscode: dto.meetingPasscode,
        }),
        ...(dto.scheduledStartAt !== undefined && {
          scheduledStartAt: dto.scheduledStartAt
            ? new Date(dto.scheduledStartAt)
            : null,
        }),
        ...(dto.scheduledEndAt !== undefined && {
          scheduledEndAt: dto.scheduledEndAt
            ? new Date(dto.scheduledEndAt)
            : null,
        }),
        ...(dto.recordingVideoId !== undefined && {
          recordingVideoId: dto.recordingVideoId,
        }),
        ...(dto.recordingDurationSeconds !== undefined && {
          recordingDurationSeconds: dto.recordingDurationSeconds,
        }),
        ...(dto.recordingThumbnail !== undefined && {
          recordingThumbnail: dto.recordingThumbnail,
        }),
        ...(dto.resources !== undefined && { resources: dto.resources }),
        updatedAt: new Date(),
      })
      .where(eq(batchSessions.sessionId, sessionId))
      .returning();
    return updated;
  }

  async remove(batchId: string, sessionId: string) {
    await this.requireSession(batchId, sessionId);
    await this.db
      .update(batchSessions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchSessions.sessionId, sessionId));
    return { success: true };
  }

  async recordAttendance(
    batchId: string,
    sessionId: string,
    viewer: SignedInViewer,
    dto: RecordAttendanceDto,
  ) {
    await this.access.require(batchId, viewer, "READ");
    const session = await this.requireSession(batchId, sessionId);
    if (session.type !== "LIVE") {
      throw new BadRequestException("Attendance only tracked for live sessions");
    }

    const userId = viewer.userId;
    const [existing] = await this.db
      .select()
      .from(batchAttendance)
      .where(
        and(
          eq(batchAttendance.sessionId, sessionId),
          eq(batchAttendance.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      if (dto.durationSeconds !== undefined) {
        await this.db
          .update(batchAttendance)
          .set({ durationSeconds: dto.durationSeconds })
          .where(eq(batchAttendance.attendanceId, existing.attendanceId));
      }
      return { success: true, alreadyRecorded: true };
    }

    await this.db.insert(batchAttendance).values({
      batchId,
      sessionId,
      userId,
      durationSeconds: dto.durationSeconds,
    });
    return { success: true, alreadyRecorded: false };
  }

  async attendanceFor(
    batchId: string,
    userId: string,
  ): Promise<{ liveTotal: number; attended: number; percent: number | null }> {
    const [[{ liveTotal }], [{ attended }]] = await Promise.all([
      this.db
        .select({ liveTotal: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "LIVE"),
            eq(batchSessions.isDeleted, false),
          ),
        ),
      this.db
        .select({ attended: sql<number>`count(*)::int` })
        .from(batchAttendance)
        .where(
          and(
            eq(batchAttendance.batchId, batchId),
            eq(batchAttendance.userId, userId),
          ),
        ),
    ]);

    return {
      liveTotal,
      attended,
      percent:
        liveTotal > 0 ? Number(((attended / liveTotal) * 100).toFixed(1)) : null,
    };
  }

  async listAttendance(batchId: string, sessionId: string) {
    await this.access.requireBatch(batchId);
    const rows = await this.db
      .select({
        attendance: batchAttendance,
        user: {
          userId: users.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(batchAttendance)
      .innerJoin(users, eq(batchAttendance.userId, users.userId))
      .where(
        and(
          eq(batchAttendance.batchId, batchId),
          eq(batchAttendance.sessionId, sessionId),
        ),
      )
      .orderBy(asc(batchAttendance.joinedAt));

    return rows.map((r) => ({
      ...r.attendance,
      user: { ...r.user, profileImage: this.media.url(r.user.profileImage) },
    }));
  }

  private validateSessionShape(dto: CreateBatchSessionDto): void {
    if (dto.type === "LIVE") {
      if (!dto.scheduledStartAt || !dto.scheduledEndAt) {
        throw new BadRequestException(
          "LIVE sessions require scheduledStartAt and scheduledEndAt",
        );
      }
      if (new Date(dto.scheduledEndAt) <= new Date(dto.scheduledStartAt)) {
        throw new BadRequestException(
          "scheduledEndAt must be after scheduledStartAt",
        );
      }
      if (!dto.liveProvider) {
        throw new BadRequestException("LIVE sessions require liveProvider");
      }
      if (dto.liveProvider !== "GOOGLE_MEET" && !dto.joinUrl) {
        throw new BadRequestException(
          "joinUrl is required for non-Google-Meet live providers",
        );
      }
    }

    if (dto.type === "RECORDING" && !dto.recordingVideoId) {
      throw new BadRequestException(
        "RECORDING sessions require recordingVideoId (Bunny Stream ID)",
      );
    }
  }

  private async requireSession(batchId: string, sessionId: string) {
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
