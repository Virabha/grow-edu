import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  assessmentAttempts,
  batchAttendance,
  batchEnrollments,
  batchQuizAttempts,
  batchQuizzes,
  batchSessions,
  batchSubjects,
  lessonProgress,
  lessons,
  parentLinks,
  subjectLessons,
} from '../database/schema';

@Injectable()
export class ParentViewService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async assertActiveLink(
    parentUserId: string,
    studentUserId: string,
  ): Promise<void> {
    const [link] = await this.db
      .select({ linkId: parentLinks.linkId })
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.parentUserId, parentUserId),
          eq(parentLinks.studentUserId, studentUserId),
          eq(parentLinks.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (!link) {
      throw new NotFoundException('Student not found');
    }
  }

  private async assertStudentEnrolled(
    batchId: string,
    studentUserId: string,
  ): Promise<void> {
    const [enrolment] = await this.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, studentUserId),
          eq(batchEnrollments.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (!enrolment) {
      throw new NotFoundException('Batch not found');
    }
  }

  async progress(
    parentUserId: string,
    studentUserId: string,
    batchId: string,
  ) {
    await this.assertActiveLink(parentUserId, studentUserId);
    await this.assertStudentEnrolled(batchId, studentUserId);

    const [[{ liveTotal }], [{ attended }]] = await Promise.all([
      this.db
        .select({ liveTotal: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, 'LIVE'),
            eq(batchSessions.isDeleted, false),
          ),
        ),
      this.db
        .select({ attended: sql<number>`count(*)::int` })
        .from(batchAttendance)
        .where(
          and(
            eq(batchAttendance.batchId, batchId),
            eq(batchAttendance.userId, studentUserId),
          ),
        ),
    ]);

    const [{ lessonTotal }] = await this.db
      .select({ lessonTotal: sql<number>`count(*)::int` })
      .from(subjectLessons)
      .innerJoin(lessons, eq(lessons.lessonId, subjectLessons.lessonId))
      .innerJoin(
        batchSubjects,
        eq(batchSubjects.subjectId, subjectLessons.subjectId),
      )
      .where(
        and(
          eq(batchSubjects.batchId, batchId),
          eq(subjectLessons.isDeleted, false),
          eq(lessons.isDeleted, false),
          eq(lessons.status, 'READY'),
        ),
      );

    const [{ lessonsDone }] = await this.db
      .select({ lessonsDone: sql<number>`count(*)::int` })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.batchId, batchId),
          eq(lessonProgress.userId, studentUserId),
          eq(lessonProgress.completed, true),
        ),
      );

    const quizAttempts = await this.db
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
          eq(batchQuizAttempts.userId, studentUserId),
          eq(batchQuizAttempts.status, 'SUBMITTED'),
        ),
      );

    const bestByQuiz = new Map<string, { score: number; max: number }>();
    for (const a of quizAttempts) {
      const score = a.score ? Number(a.score) : 0;
      const max = a.maxScore ? Number(a.maxScore) : 0;
      const prev = bestByQuiz.get(a.quizId);
      if (!prev || score > prev.score) bestByQuiz.set(a.quizId, { score, max });
    }
    const totalScore = [...bestByQuiz.values()].reduce(
      (s, v) => s + v.score,
      0,
    );
    const totalMax = [...bestByQuiz.values()].reduce((s, v) => s + v.max, 0);
    const avgPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : null;

    return {
      sessions: {
        liveTotal,
        attended,
        attendancePercent:
          liveTotal > 0
            ? Number(((attended / liveTotal) * 100).toFixed(1))
            : null,
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
        total: bestByQuiz.size,
        averageScorePercent:
          avgPercent != null ? Number(avgPercent.toFixed(1)) : null,
      },
    };
  }

  async attendance(
    parentUserId: string,
    studentUserId: string,
    batchId: string,
  ) {
    await this.assertActiveLink(parentUserId, studentUserId);
    await this.assertStudentEnrolled(batchId, studentUserId);

    const [[{ liveTotal }], [{ attended }]] = await Promise.all([
      this.db
        .select({ liveTotal: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, 'LIVE'),
            eq(batchSessions.isDeleted, false),
          ),
        ),
      this.db
        .select({ attended: sql<number>`count(*)::int` })
        .from(batchAttendance)
        .where(
          and(
            eq(batchAttendance.batchId, batchId),
            eq(batchAttendance.userId, studentUserId),
          ),
        ),
    ]);

    return {
      liveTotal,
      attended,
      percent:
        liveTotal > 0
          ? Number(((attended / liveTotal) * 100).toFixed(1))
          : null,
    };
  }

  async result(
    parentUserId: string,
    studentUserId: string,
    attemptId: string,
  ) {
    await this.assertActiveLink(parentUserId, studentUserId);

    const [attempt] = await this.db
      .select({
        attemptId: assessmentAttempts.attemptId,
        userId: assessmentAttempts.userId,
        testId: assessmentAttempts.testId,
        status: assessmentAttempts.status,
        provisionalScore: assessmentAttempts.provisionalScore,
        finalScore: assessmentAttempts.finalScore,
        maxScore: assessmentAttempts.maxScore,
      })
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, attemptId))
      .limit(1);

    if (!attempt || attempt.userId !== studentUserId) {
      throw new NotFoundException('Result not found');
    }

    return attempt;
  }
}
