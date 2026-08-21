import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assignments,
  batchAttendance,
  batchQuizzes,
  batchSessions,
} from "../../database/schema";
import { CdnService } from "../../cdn/cdn.service";
import { BatchAccessService, SignedInViewer } from "../access/batch-access.service";
import { BatchMediaService } from "../batch-media.service";

export type TimetableKind = "SESSION" | "TEST" | "DEADLINE";

export type TimetableStatus =
  | "UPCOMING"
  | "LIVE_NOW"
  | "ATTENDED"
  | "MISSED"
  | "AVAILABLE"
  | "CLOSED";

export interface TimetableItem {
  kind: TimetableKind;
  id: string;
  title: string;
  subjectId: string | null;
  startsAt: string;
  endsAt: string | null;
  status: TimetableStatus;
  joinUrl: string | null;
  recordingVideoId: string | null;
  recordingThumbnail: string | null;
  playbackUrl: string | null;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

@Injectable()
export class TimetableService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly media: BatchMediaService,
    private readonly cdn: CdnService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async forBatch(batchId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "READ");

    const now = this.clock.now();
    const [sessions, quizzes, deadlines, attended] = await Promise.all([
      this.sessionsOn(batchId),
      this.testsOn(batchId),
      this.deadlinesOn(batchId),
      this.attendedSessionIds(batchId, viewer.userId),
    ]);

    const items = [
      ...sessions.map((session) => this.asSessionItem(session, now, attended)),
      ...quizzes.map((quiz) => this.asTestItem(quiz, now)),
      ...deadlines.map((deadline) => this.asDeadlineItem(deadline, now)),
    ].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

    return {
      now: now.toISOString(),
      today: items.filter((item) => sameDay(new Date(item.startsAt), now)),
      upcoming: items.filter(
        (item) =>
          new Date(item.startsAt).getTime() > now.getTime() &&
          !sameDay(new Date(item.startsAt), now),
      ),
      missed: items.filter((item) => item.status === "MISSED"),
      items,
    };
  }

  private async sessionsOn(batchId: string) {
    return this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.batchId, batchId),
          eq(batchSessions.isDeleted, false),
        ),
      );
  }

  private async testsOn(batchId: string) {
    return this.db
      .select()
      .from(batchQuizzes)
      .where(
        and(
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizzes.isDeleted, false),
          isNotNull(batchQuizzes.publishedAt),
        ),
      );
  }

  private async deadlinesOn(batchId: string) {
    return this.db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.batchId, batchId),
          eq(assignments.isDeleted, false),
          eq(assignments.isPublished, true),
          isNotNull(assignments.dueAt),
        ),
      );
  }

  private async attendedSessionIds(
    batchId: string,
    userId: string,
  ): Promise<Set<string>> {
    const rows = await this.db
      .select({ sessionId: batchAttendance.sessionId })
      .from(batchAttendance)
      .where(
        and(
          eq(batchAttendance.batchId, batchId),
          eq(batchAttendance.userId, userId),
        ),
      );
    return new Set(rows.map((r) => r.sessionId));
  }

  private asSessionItem(
    session: typeof batchSessions.$inferSelect,
    now: Date,
    attended: Set<string>,
  ): TimetableItem {
    const startsAt = session.scheduledStartAt ?? session.createdAt;
    const endsAt = session.scheduledEndAt;
    const running =
      session.type === "LIVE" &&
      startsAt.getTime() <= now.getTime() &&
      (endsAt === null || endsAt.getTime() > now.getTime());
    const finished =
      endsAt !== null
        ? endsAt.getTime() <= now.getTime()
        : startsAt.getTime() <= now.getTime();

    let status: TimetableStatus = "UPCOMING";
    if (session.type === "RECORDING") {
      status = "AVAILABLE";
    } else if (running) {
      status = "LIVE_NOW";
    } else if (finished) {
      status = attended.has(session.sessionId) ? "ATTENDED" : "MISSED";
    }

    return {
      kind: "SESSION",
      id: session.sessionId,
      title: session.title,
      subjectId: session.subjectId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
      status,
      joinUrl: running ? session.joinUrl : null,
      recordingVideoId: session.recordingVideoId,
      recordingThumbnail: this.media.url(session.recordingThumbnail),
      playbackUrl: this.playbackFor(session.recordingVideoId),
    };
  }

  private asTestItem(
    quiz: typeof batchQuizzes.$inferSelect,
    now: Date,
  ): TimetableItem {
    const startsAt = quiz.opensAt ?? quiz.publishedAt ?? quiz.createdAt;
    const closed =
      quiz.closesAt !== null && quiz.closesAt.getTime() <= now.getTime();
    const open = startsAt.getTime() <= now.getTime() && !closed;

    return {
      kind: "TEST",
      id: quiz.quizId,
      title: quiz.title,
      subjectId: quiz.subjectId,
      startsAt: startsAt.toISOString(),
      endsAt: quiz.closesAt ? quiz.closesAt.toISOString() : null,
      status: closed ? "CLOSED" : open ? "AVAILABLE" : "UPCOMING",
      joinUrl: null,
      recordingVideoId: null,
      recordingThumbnail: null,
      playbackUrl: null,
    };
  }

  private asDeadlineItem(
    assignment: typeof assignments.$inferSelect,
    now: Date,
  ): TimetableItem {
    const dueAt = assignment.dueAt as Date;
    return {
      kind: "DEADLINE",
      id: assignment.id,
      title: assignment.title,
      subjectId: null,
      startsAt: dueAt.toISOString(),
      endsAt: null,
      status: dueAt.getTime() <= now.getTime() ? "CLOSED" : "UPCOMING",
      joinUrl: null,
      recordingVideoId: null,
      recordingThumbnail: null,
      playbackUrl: null,
    };
  }

  private playbackFor(recordingVideoId: string | null): string | null {
    if (!recordingVideoId) return null;
    try {
      return this.cdn.getSignedEmbedUrl(recordingVideoId);
    } catch {
      return null;
    }
  }
}
