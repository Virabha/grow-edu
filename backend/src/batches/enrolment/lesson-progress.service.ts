import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchAttendance,
  batchQuizAttempts,
  lessonProgress,
  lessons,
  richLessonContent,
} from "../../database/schema";
import { CLOCK, Clock } from "../../common/clock";
import { COMPLETION_SETTINGS_GROUP } from "../../settings/settings.definitions";
import { SettingsService } from "../../settings/settings.service";
import {
  BatchAccessService,
  SignedInViewer,
} from "../access/batch-access.service";
import {
  RecordLessonProgressDto,
  RecordPositionsDto,
} from "../dto/lesson-progress.dto";
import {
  CompletionThresholds,
  LessonKind,
  clampPosition,
  honoursClientCompletion,
  isComplete,
  readThresholds,
} from "./completion";

type LessonRow = typeof lessons.$inferSelect;
type ProgressRow = typeof lessonProgress.$inferSelect;

@Injectable()
export class LessonProgressService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly settings: SettingsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async record(
    batchId: string,
    lessonId: string,
    viewer: SignedInViewer,
    dto: RecordLessonProgressDto,
  ) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      "READ",
      batchId,
    );
    const now = this.clock.now();
    const existing = await this.existingProgress(viewer.userId, lessonId);

    const watchedSeconds = Math.max(
      existing?.watchedSeconds ?? 0,
      dto.watchedSeconds ?? 0,
    );
    const listenedSeconds = Math.max(
      existing?.listenedSeconds ?? 0,
      dto.listenedSeconds ?? 0,
    );
    const pagesViewed = Math.max(
      existing?.pagesViewed ?? 0,
      dto.pagesViewed ?? 0,
    );

    const position =
      dto.lastPosition === undefined
        ? existing?.lastPosition ?? null
        : clampPosition(dto.lastPosition, lesson.duration);

    const completed = await this.evaluate(lesson, viewer.userId, {
      watchedSeconds,
      listenedSeconds,
      pagesViewed,
      markedComplete: dto.completed ?? existing?.completed ?? false,
    });

    const [row] = await this.db
      .insert(lessonProgress)
      .values({
        userId: viewer.userId,
        lessonId,
        batchId,
        completed,
        completedAt: completed ? now : null,
        timeSpent: dto.timeSpent ?? 0,
        lastPosition: position,
        positionRecordedAt: dto.lastPosition === undefined ? null : now,
        watchedSeconds,
        listenedSeconds,
        pagesViewed,
        lastAccessed: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          completed,
          ...(completed &&
            !existing?.completed && { completedAt: now }),
          ...(dto.timeSpent !== undefined && {
            timeSpent: sql`${lessonProgress.timeSpent} + ${dto.timeSpent}`,
          }),
          ...(dto.lastPosition !== undefined && {
            lastPosition: position,
            positionRecordedAt: now,
          }),
          watchedSeconds,
          listenedSeconds,
          pagesViewed,
          lastAccessed: now,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }

  async recordPositions(
    batchId: string,
    viewer: SignedInViewer,
    dto: RecordPositionsDto,
  ) {
    const now = this.clock.now();
    const latest = new Map<
      string,
      { positionSeconds: number; recordedAt: Date; watchedSeconds: number }
    >();

    for (const update of dto.positions) {
      const recordedAt = new Date(update.recordedAt);
      if (Number.isNaN(recordedAt.getTime())) continue;
      const held = latest.get(update.lessonId);
      const watchedSeconds = Math.max(
        held?.watchedSeconds ?? 0,
        update.watchedSeconds ?? 0,
      );
      if (held && held.recordedAt.getTime() >= recordedAt.getTime()) {
        latest.set(update.lessonId, { ...held, watchedSeconds });
        continue;
      }
      latest.set(update.lessonId, {
        positionSeconds: update.positionSeconds,
        recordedAt,
        watchedSeconds,
      });
    }

    const applied: ProgressRow[] = [];
    for (const [lessonId, update] of latest) {
      const { lesson } = await this.access.requireForLesson(
        lessonId,
        viewer,
        "READ",
        batchId,
      );
      const existing = await this.existingProgress(viewer.userId, lessonId);
      const stale =
        existing?.positionRecordedAt !== null &&
        existing?.positionRecordedAt !== undefined &&
        existing.positionRecordedAt.getTime() >= update.recordedAt.getTime();

      const watchedSeconds = Math.max(
        existing?.watchedSeconds ?? 0,
        update.watchedSeconds,
      );
      const position = stale
        ? existing?.lastPosition ?? null
        : clampPosition(update.positionSeconds, lesson.duration);
      const recordedAt = stale
        ? existing?.positionRecordedAt ?? null
        : update.recordedAt;

      const completed = await this.evaluate(lesson, viewer.userId, {
        watchedSeconds,
        listenedSeconds: existing?.listenedSeconds ?? 0,
        pagesViewed: existing?.pagesViewed ?? 0,
        markedComplete: existing?.completed ?? false,
      });

      const [row] = await this.db
        .insert(lessonProgress)
        .values({
          userId: viewer.userId,
          lessonId,
          batchId,
          completed,
          completedAt: completed ? now : null,
          lastPosition: position,
          positionRecordedAt: recordedAt,
          watchedSeconds,
          lastAccessed: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: {
            completed,
            ...(completed && !existing?.completed && { completedAt: now }),
            lastPosition: position,
            positionRecordedAt: recordedAt,
            watchedSeconds,
            lastAccessed: now,
            updatedAt: now,
          },
        })
        .returning();
      applied.push(row);
    }

    return { applied: applied.length, positions: applied };
  }

  async positionFor(batchId: string, lessonId: string, viewer: SignedInViewer) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      "READ",
      batchId,
    );
    const existing = await this.existingProgress(viewer.userId, lessonId);
    return {
      lessonId,
      positionSeconds: existing?.lastPosition ?? 0,
      recordedAt: existing?.positionRecordedAt ?? null,
      durationSeconds: lesson.duration,
      completed: existing?.completed ?? false,
    };
  }

  async listFor(batchId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "READ");
    return this.db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.batchId, batchId),
          eq(lessonProgress.userId, viewer.userId),
        ),
      );
  }

  async reconcile(batchId: string, lessonId: string, viewer: SignedInViewer) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      "READ",
      batchId,
    );
    const existing = await this.existingProgress(viewer.userId, lessonId);
    if (!existing) {
      throw new NotFoundException("No progress has been recorded yet");
    }
    const completed = await this.evaluate(lesson, viewer.userId, {
      watchedSeconds: existing.watchedSeconds,
      listenedSeconds: existing.listenedSeconds,
      pagesViewed: existing.pagesViewed,
      markedComplete: existing.completed,
    });
    if (completed === existing.completed) return existing;
    const now = this.clock.now();
    const [row] = await this.db
      .update(lessonProgress)
      .set({
        completed,
        ...(completed && { completedAt: now }),
        updatedAt: now,
      })
      .where(
        eq(lessonProgress.lessonProgressId, existing.lessonProgressId),
      )
      .returning();
    return row;
  }

  private async evaluate(
    lesson: LessonRow,
    userId: string,
    measured: {
      watchedSeconds: number;
      listenedSeconds: number;
      pagesViewed: number;
      markedComplete: boolean;
    },
  ): Promise<boolean> {
    const thresholds = await this.thresholds();
    const type: LessonKind = lesson.type;
    const blockCount = await this.blockCountFor(lesson);

    const markedComplete =
      honoursClientCompletion(
        type,
        lesson.duration,
        lesson.audioDuration,
        lesson.documentPageCount,
        blockCount,
      ) && measured.markedComplete;

    return isComplete(
      {
        type,
        watchedSeconds: measured.watchedSeconds,
        listenedSeconds: measured.listenedSeconds,
        pagesViewed: measured.pagesViewed,
        durationSeconds: lesson.duration,
        audioDurationSeconds: lesson.audioDuration,
        pageCount: lesson.documentPageCount,
        blockCount,
        quizSubmitted:
          type === "QUIZ" ? await this.quizSubmitted(lesson, userId) : false,
        attendanceSeconds:
          type === "LIVE_SESSION"
            ? await this.attendanceSeconds(lesson, userId)
            : 0,
        markedComplete,
      },
      thresholds,
    );
  }

  private async blockCountFor(lesson: LessonRow): Promise<number | null> {
    if (lesson.type !== "RICH") return null;
    const [rich] = await this.db
      .select({ blocks: richLessonContent.blocks })
      .from(richLessonContent)
      .where(eq(richLessonContent.lessonId, lesson.lessonId));
    return rich ? rich.blocks.length : null;
  }

  private async quizSubmitted(
    lesson: LessonRow,
    userId: string,
  ): Promise<boolean> {
    if (lesson.quizId === null) return false;
    const [attempt] = await this.db
      .select({ attemptId: batchQuizAttempts.attemptId })
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.quizId, lesson.quizId),
          eq(batchQuizAttempts.userId, userId),
          inArray(batchQuizAttempts.status, ["SUBMITTED"]),
        ),
      )
      .limit(1);
    return attempt !== undefined;
  }

  private async attendanceSeconds(
    lesson: LessonRow,
    userId: string,
  ): Promise<number> {
    if (lesson.sessionId === null) return 0;
    const [row] = await this.db
      .select({ durationSeconds: batchAttendance.durationSeconds })
      .from(batchAttendance)
      .where(
        and(
          eq(batchAttendance.sessionId, lesson.sessionId),
          eq(batchAttendance.userId, userId),
        ),
      );
    return row?.durationSeconds ?? 0;
  }

  private async existingProgress(
    userId: string,
    lessonId: string,
  ): Promise<ProgressRow | undefined> {
    const [row] = await this.db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.lessonId, lessonId),
        ),
      );
    return row;
  }

  private async thresholds(): Promise<CompletionThresholds> {
    const group = await this.settings.getGroup(COMPLETION_SETTINGS_GROUP);
    return readThresholds(group.values);
  }
}
