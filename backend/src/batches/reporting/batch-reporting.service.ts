import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchAnnouncements,
  batchAttendance,
  batchCertificates,
  batchDoubts,
  batchEnrollments,
  batchQuizAttempts,
  batchQuizzes,
  batchResources,
  batchSessions,
  batchSubjects,
  batches,
  lessonProgress,
  lessons,
} from "../../database/schema";
import {
  BatchAccessService,
  SignedInViewer,
} from "../access/batch-access.service";
import { BatchEnrolmentService } from "../enrolment/batch-enrolment.service";
import { BatchSchedulingService } from "../scheduling/batch-scheduling.service";

@Injectable()
export class BatchReportingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly enrolments: BatchEnrolmentService,
    private readonly scheduling: BatchSchedulingService,
  ) {}

  async analytics(batchId: string) {
    await this.access.requireBatch(batchId);

    const [
      [{ enrollmentCount }],
      [{ liveCount }],
      [{ recordingCount }],
      [{ resourceCount }],
      [{ doubtCount }],
      [{ openDoubtCount }],
      [{ quizCount }],
      attendanceRows,
      quizAvgRow,
    ] = await Promise.all([
      this.db
        .select({ enrollmentCount: sql<number>`count(*)::int` })
        .from(batchEnrollments)
        .where(
          and(
            eq(batchEnrollments.batchId, batchId),
            eq(batchEnrollments.status, "ACTIVE"),
          ),
        ),
      this.db
        .select({ liveCount: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "LIVE"),
            eq(batchSessions.isDeleted, false),
          ),
        ),
      this.db
        .select({ recordingCount: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "RECORDING"),
            eq(batchSessions.isDeleted, false),
          ),
        ),
      this.db
        .select({ resourceCount: sql<number>`count(*)::int` })
        .from(batchResources)
        .where(
          and(
            eq(batchResources.batchId, batchId),
            eq(batchResources.isDeleted, false),
          ),
        ),
      this.db
        .select({ doubtCount: sql<number>`count(*)::int` })
        .from(batchDoubts)
        .where(
          and(eq(batchDoubts.batchId, batchId), eq(batchDoubts.isDeleted, false)),
        ),
      this.db
        .select({ openDoubtCount: sql<number>`count(*)::int` })
        .from(batchDoubts)
        .where(
          and(
            eq(batchDoubts.batchId, batchId),
            eq(batchDoubts.isDeleted, false),
            eq(batchDoubts.status, "OPEN"),
          ),
        ),
      this.db
        .select({ quizCount: sql<number>`count(*)::int` })
        .from(batchQuizzes)
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizzes.isDeleted, false),
          ),
        ),
      this.db
        .select({
          sessionId: batchAttendance.sessionId,
          attended: sql<number>`count(*)::int`,
        })
        .from(batchAttendance)
        .where(eq(batchAttendance.batchId, batchId))
        .groupBy(batchAttendance.sessionId),
      this.db
        .select({
          avgScore: sql<number>`avg(
            (cast(${batchQuizAttempts.score} as numeric) /
             nullif(cast(${batchQuizAttempts.maxScore} as numeric), 0)) * 100
          )::float`,
        })
        .from(batchQuizAttempts)
        .innerJoin(
          batchQuizzes,
          eq(batchQuizAttempts.quizId, batchQuizzes.quizId),
        )
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizAttempts.status, "SUBMITTED"),
          ),
        ),
    ]);

    const totalAttendanceEvents = attendanceRows.reduce(
      (sum, r) => sum + Number(r.attended),
      0,
    );
    const avgAttendancePerSession =
      liveCount > 0 && enrollmentCount > 0
        ? (totalAttendanceEvents / (liveCount * enrollmentCount)) * 100
        : 0;

    return {
      enrollmentCount,
      liveSessions: liveCount,
      recordings: recordingCount,
      resources: resourceCount,
      doubts: doubtCount,
      openDoubts: openDoubtCount,
      quizzes: quizCount,
      avgAttendancePercent: Number(avgAttendancePerSession.toFixed(1)),
      avgQuizScorePercent:
        quizAvgRow.length > 0 && quizAvgRow[0].avgScore != null
          ? Number(quizAvgRow[0].avgScore.toFixed(1))
          : null,
    };
  }

  async myDashboard(userId: string) {
    const myBatches = await this.enrolments.findMine(userId);
    const batchIds = myBatches.map((b) => b.batchId);

    if (batchIds.length === 0) {
      return {
        batches: myBatches,
        upcomingLive: [],
        openQuizzes: [],
        recentAnnouncements: [],
        myCertificates: [],
      };
    }

    const batchColumns = {
      batchId: batches.batchId,
      title: batches.title,
      slug: batches.slug,
    };

    const [upcomingLive, openQuizzes, recentAnnouncements, myCertificates] =
      await Promise.all([
        this.db
          .select({ session: batchSessions, batch: batchColumns })
          .from(batchSessions)
          .innerJoin(batches, eq(batchSessions.batchId, batches.batchId))
          .where(
            and(
              inArray(batchSessions.batchId, batchIds),
              eq(batchSessions.type, "LIVE"),
              eq(batchSessions.isDeleted, false),
              sql`${batchSessions.scheduledStartAt} >= now() - interval '15 minutes'`,
            ),
          )
          .orderBy(asc(batchSessions.scheduledStartAt))
          .limit(10),
        this.db
          .select({ quiz: batchQuizzes, batch: batchColumns })
          .from(batchQuizzes)
          .innerJoin(batches, eq(batchQuizzes.batchId, batches.batchId))
          .where(
            and(
              inArray(batchQuizzes.batchId, batchIds),
              eq(batchQuizzes.isDeleted, false),
              sql`${batchQuizzes.publishedAt} IS NOT NULL`,
              or(
                sql`${batchQuizzes.closesAt} IS NULL`,
                sql`${batchQuizzes.closesAt} >= now()`,
              ),
            ),
          )
          .orderBy(desc(batchQuizzes.createdAt))
          .limit(10),
        this.db
          .select({ announcement: batchAnnouncements, batch: batchColumns })
          .from(batchAnnouncements)
          .innerJoin(batches, eq(batchAnnouncements.batchId, batches.batchId))
          .where(
            and(
              inArray(batchAnnouncements.batchId, batchIds),
              eq(batchAnnouncements.isDeleted, false),
            ),
          )
          .orderBy(desc(batchAnnouncements.createdAt))
          .limit(10),
        this.db
          .select({ cert: batchCertificates, batch: batchColumns })
          .from(batchCertificates)
          .innerJoin(batches, eq(batchCertificates.batchId, batches.batchId))
          .where(
            and(
              eq(batchCertificates.userId, userId),
              sql`${batchCertificates.revokedAt} IS NULL`,
            ),
          )
          .limit(10),
      ]);

    return {
      batches: myBatches,
      upcomingLive: upcomingLive.map((r) => ({ ...r.session, batch: r.batch })),
      openQuizzes: openQuizzes.map((r) => ({ ...r.quiz, batch: r.batch })),
      recentAnnouncements: recentAnnouncements.map((r) => ({
        ...r.announcement,
        batch: r.batch,
      })),
      myCertificates,
    };
  }

  async myProgress(batchId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "READ");
    const userId = viewer.userId;

    const [
      attendance,
      [{ recordingTotal }],
      [{ quizTotal }],
      [{ lessonTotal }],
      [{ lessonsDone }],
      myAttempts,
    ] = await Promise.all([
      this.scheduling.attendanceFor(batchId, userId),
      this.db
        .select({ recordingTotal: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "RECORDING"),
            eq(batchSessions.isDeleted, false),
          ),
        ),
      this.db
        .select({ quizTotal: sql<number>`count(*)::int` })
        .from(batchQuizzes)
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizzes.isDeleted, false),
            sql`${batchQuizzes.publishedAt} IS NOT NULL`,
          ),
        ),
      this.db
        .select({ lessonTotal: sql<number>`count(*)::int` })
        .from(lessons)
        .innerJoin(batchSubjects, eq(batchSubjects.subjectId, lessons.subjectId))
        .where(
          and(
            eq(batchSubjects.batchId, batchId),
            eq(lessons.isDeleted, false),
            eq(lessons.status, "READY"),
          ),
        ),
      this.db
        .select({ lessonsDone: sql<number>`count(*)::int` })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.batchId, batchId),
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.completed, true),
          ),
        ),
      this.db
        .select({
          quizId: batchQuizAttempts.quizId,
          score: batchQuizAttempts.score,
          maxScore: batchQuizAttempts.maxScore,
        })
        .from(batchQuizAttempts)
        .innerJoin(
          batchQuizzes,
          eq(batchQuizAttempts.quizId, batchQuizzes.quizId),
        )
        .where(
          and(
            eq(batchQuizzes.batchId, batchId),
            eq(batchQuizAttempts.userId, userId),
            eq(batchQuizAttempts.status, "SUBMITTED"),
          ),
        ),
    ]);

    const bestByQuiz = new Map<string, { score: number; max: number }>();
    for (const a of myAttempts) {
      const score = a.score ? Number(a.score) : 0;
      const max = a.maxScore ? Number(a.maxScore) : 0;
      const prev = bestByQuiz.get(a.quizId);
      if (!prev || score > prev.score) bestByQuiz.set(a.quizId, { score, max });
    }
    const totalScore = [...bestByQuiz.values()].reduce((s, v) => s + v.score, 0);
    const totalMax = [...bestByQuiz.values()].reduce((s, v) => s + v.max, 0);
    const avgPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : null;

    return {
      sessions: {
        liveTotal: attendance.liveTotal,
        attended: attendance.attended,
        attendancePercent: attendance.percent,
        recordings: recordingTotal,
      },
      lessons: {
        total: lessonTotal,
        completed: lessonsDone,
        completionPercent:
          lessonTotal > 0
            ? Number(((lessonsDone / lessonTotal) * 100).toFixed(1))
            : 0,
      },
      quizzes: {
        total: quizTotal,
        attempted: bestByQuiz.size,
        averageScorePercent:
          avgPercent != null ? Number(avgPercent.toFixed(1)) : null,
      },
    };
  }
}
