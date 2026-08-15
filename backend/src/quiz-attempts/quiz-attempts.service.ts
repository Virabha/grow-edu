import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and, desc, sql, isNotNull, inArray } from 'drizzle-orm';
import {
  lessonQuizAttempts,
  lessons,
  courses,
  sectionAccess,
  enrollments,
  type LessonQuizAnswerSnapshot,
} from '../database/schema';
import { FilterQuizAttemptsDto } from './dto/filter-quiz-attempts.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';

export interface QuizAnswerDto {
  questionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number | null;
  explanation: string;
}

export interface QuizAttemptDto {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  passMark: number;
  passed: boolean;
  durationSeconds: number;
  attemptNo: number;
  submittedAt: string;
  answers: QuizAnswerDto[];
}

export interface QuizAttemptSummaryDto {
  totalAttempted: number;
  passed: number;
  averageScore: number;
}

type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'REVOKED';
const ACTIVE_STATUSES: EnrollmentStatus[] = ['ACTIVE', 'COMPLETED'];

function maskAnswers(answers: LessonQuizAnswerSnapshot[]): QuizAnswerDto[] {
  return answers.map((a) => ({
    questionId:   a.questionId,
    question:     a.question,
    options:      a.options,
    correctIndex: -1,
    chosenIndex:  a.chosenIndex,
    explanation:  '',
  }));
}

function exposeAnswers(answers: LessonQuizAnswerSnapshot[]): QuizAnswerDto[] {
  return answers.map((a) => ({
    questionId:   a.questionId,
    question:     a.question,
    options:      a.options,
    correctIndex: a.correctIndex,
    chosenIndex:  a.chosenIndex,
    explanation:  a.explanation,
  }));
}

function buildAttemptDto(row: {
  attemptId: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  attemptNo: number;
  totalQuestions: number;
  correctCount: number;
  scorePercent: string;
  passMark: number;
  passed: boolean;
  durationSeconds: number;
  startedAt: Date;
  submittedAt: Date | null;
  answers: LessonQuizAnswerSnapshot[];
}): QuizAttemptDto {
  const isSubmitted = row.submittedAt !== null;
  return {
    attemptId:      row.attemptId,
    quizId:         row.lessonId,
    quizTitle:      row.lessonTitle,
    courseId:       row.courseId,
    courseTitle:    row.courseTitle,
    lessonTitle:    row.lessonTitle,
    totalQuestions: row.totalQuestions,
    correctCount:   row.correctCount,
    scorePercent:   Number(row.scorePercent),
    passMark:       row.passMark,
    passed:         row.passed,
    durationSeconds:row.durationSeconds,
    attemptNo:      row.attemptNo,
    submittedAt:    row.submittedAt?.toISOString() ?? row.startedAt.toISOString(),
    answers:        isSubmitted ? exposeAnswers(row.answers) : maskAnswers(row.answers),
  };
}

@Injectable()
export class QuizAttemptsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(userId: string, dto: FilterQuizAttemptsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(lessonQuizAttempts.userId, userId),
      dto.courseId && dto.courseId !== 'all'
        ? eq(lessonQuizAttempts.courseId, dto.courseId)
        : undefined,
      dto.result === 'passed'
        ? eq(lessonQuizAttempts.passed, true)
        : undefined,
      dto.result === 'failed'
        ? eq(lessonQuizAttempts.passed, false)
        : undefined,
      isNotNull(lessonQuizAttempts.submittedAt),
    );

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          attemptId:      lessonQuizAttempts.attemptId,
          lessonId:       lessonQuizAttempts.lessonId,
          courseId:       lessonQuizAttempts.courseId,
          attemptNo:      lessonQuizAttempts.attemptNo,
          totalQuestions: lessonQuizAttempts.totalQuestions,
          correctCount:   lessonQuizAttempts.correctCount,
          scorePercent:   lessonQuizAttempts.scorePercent,
          passMark:       lessonQuizAttempts.passMark,
          passed:         lessonQuizAttempts.passed,
          durationSeconds:lessonQuizAttempts.durationSeconds,
          startedAt:      lessonQuizAttempts.startedAt,
          submittedAt:    lessonQuizAttempts.submittedAt,
          lessonTitle:    lessons.title,
          courseTitle:    courses.title,
          answers:        lessonQuizAttempts.answers,
        })
        .from(lessonQuizAttempts)
        .innerJoin(lessons, eq(lessonQuizAttempts.lessonId, lessons.lessonId))
        .innerJoin(courses, eq(lessonQuizAttempts.courseId, courses.courseId))
        .where(whereClause)
        .orderBy(desc(lessonQuizAttempts.submittedAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(lessonQuizAttempts)
        .innerJoin(lessons, eq(lessonQuizAttempts.lessonId, lessons.lessonId))
        .innerJoin(courses, eq(lessonQuizAttempts.courseId, courses.courseId))
        .where(whereClause),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      data: rows.map((row) => {
        const full = buildAttemptDto(row);
        return { ...full, answers: [] as QuizAnswerDto[] };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(userId: string, attemptId: string): Promise<QuizAttemptDto> {
    const [row] = await this.db
      .select({
        attemptId:      lessonQuizAttempts.attemptId,
        userId:         lessonQuizAttempts.userId,
        lessonId:       lessonQuizAttempts.lessonId,
        courseId:       lessonQuizAttempts.courseId,
        attemptNo:      lessonQuizAttempts.attemptNo,
        totalQuestions: lessonQuizAttempts.totalQuestions,
        correctCount:   lessonQuizAttempts.correctCount,
        scorePercent:   lessonQuizAttempts.scorePercent,
        passMark:       lessonQuizAttempts.passMark,
        passed:         lessonQuizAttempts.passed,
        durationSeconds:lessonQuizAttempts.durationSeconds,
        startedAt:      lessonQuizAttempts.startedAt,
        submittedAt:    lessonQuizAttempts.submittedAt,
        answers:        lessonQuizAttempts.answers,
        lessonTitle:    lessons.title,
        courseTitle:    courses.title,
      })
      .from(lessonQuizAttempts)
      .innerJoin(lessons, eq(lessonQuizAttempts.lessonId, lessons.lessonId))
      .innerJoin(courses, eq(lessonQuizAttempts.courseId, courses.courseId))
      .where(eq(lessonQuizAttempts.attemptId, attemptId))
      .limit(1);

    if (!row || row.userId !== userId) {
      throw new NotFoundException('Quiz attempt not found');
    }

    return buildAttemptDto(row);
  }

  async getSummary(userId: string): Promise<QuizAttemptSummaryDto> {
    const [row] = await this.db
      .select({
        totalAttempted:  sql<number>`COUNT(*)::int`,
        passed:          sql<number>`COUNT(*) FILTER (WHERE ${lessonQuizAttempts.passed} = TRUE)::int`,
        averageScoreRaw: sql<string | null>`AVG(${lessonQuizAttempts.scorePercent}::numeric)`,
      })
      .from(lessonQuizAttempts)
      .where(
        and(
          eq(lessonQuizAttempts.userId, userId),
          isNotNull(lessonQuizAttempts.submittedAt),
        ),
      );

    return {
      totalAttempted: row?.totalAttempted ?? 0,
      passed:         row?.passed ?? 0,
      averageScore:   Math.round(Number(row?.averageScoreRaw ?? '0') || 0),
    };
  }

  async submit(userId: string, dto: SubmitQuizAttemptDto): Promise<QuizAttemptDto> {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.lessonId, dto.lessonId),
      with: {
        section: true,
        questions: {
          orderBy: (q, { asc }) => [asc(q.order)],
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.type !== 'QUIZ') {
      throw new BadRequestException('Lesson is not a quiz');
    }

    const courseId = lesson.section.courseId;

    const [enrollment] = await this.db
      .select({ id: enrollments.enrollmentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, userId),
          inArray(enrollments.status, ACTIVE_STATUSES),
        ),
      )
      .limit(1);

    if (!enrollment) {
      const [grant] = await this.db
        .select({ id: sectionAccess.sectionAccessId })
        .from(sectionAccess)
        .where(
          and(
            eq(sectionAccess.courseId, courseId),
            eq(sectionAccess.userId, userId),
            eq(sectionAccess.sectionId, lesson.sectionId),
          ),
        )
        .limit(1);

      if (!grant) {
        throw new ForbiddenException('You must be enrolled to submit this quiz');
      }
    }

    const [countRow] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(lessonQuizAttempts)
      .where(
        and(
          eq(lessonQuizAttempts.userId, userId),
          eq(lessonQuizAttempts.lessonId, dto.lessonId),
        ),
      );

    const existingCount = countRow?.count ?? 0;
    const attemptsAllowed = lesson.quizSettings?.attemptsAllowed;

    if (attemptsAllowed !== undefined && existingCount >= attemptsAllowed) {
      throw new BadRequestException(
        `This quiz allows at most ${attemptsAllowed} attempt(s)`,
      );
    }

    const attemptNo = existingCount + 1;
    const passingPercentage = lesson.quizSettings?.passingPercentage ?? 0;
    const answerMap = new Map<string, number | null>(
      dto.answers.map((a) => [a.questionId, a.chosenIndex ?? null]),
    );

    let correctCount = 0;
    const snapshots: LessonQuizAnswerSnapshot[] = lesson.questions.map((q) => {
      const opts = q.answers ?? [];
      const firstCorrectIdx = opts.findIndex((a) => a.isCorrect);
      const chosenIdx = answerMap.get(q.quizQuestionId) ?? null;

      const chosen =
        typeof chosenIdx === 'number' && chosenIdx >= 0 && chosenIdx < opts.length
          ? opts[chosenIdx]
          : null;

      if (chosen !== null && chosen.isCorrect) {
        correctCount++;
      }

      return {
        questionId:   q.quizQuestionId,
        question:     q.question,
        options:      opts.map((a) => a.text),
        correctIndex: firstCorrectIdx,
        chosenIndex:  chosenIdx,
        explanation:  q.explanation ?? '',
      };
    });

    const totalQuestions = lesson.questions.length;
    const rawPercent = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
    const passed = rawPercent >= passingPercentage;

    const submittedAt = new Date();
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : submittedAt;
    const durationSeconds = Math.max(
      0,
      Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000),
    );

    const [courseRow] = await this.db
      .select({ courseTitle: courses.title })
      .from(courses)
      .where(eq(courses.courseId, courseId))
      .limit(1);

    const courseTitle = courseRow?.courseTitle ?? "";

    const [inserted] = await this.db
      .insert(lessonQuizAttempts)
      .values({
        userId,
        courseId,
        lessonId:       dto.lessonId,
        quizVersion:    lesson.quizVersion,
        attemptNo,
        totalQuestions,
        correctCount,
        scorePercent:   rawPercent.toString(),
        passMark:       passingPercentage,
        passed,
        durationSeconds,
        answers:        snapshots,
        startedAt,
        submittedAt,
      })
      .returning();

    return buildAttemptDto({
      attemptId:      inserted.attemptId,
      lessonId:       inserted.lessonId,
      lessonTitle:    lesson.title,
      courseId:       inserted.courseId,
      courseTitle,
      attemptNo:      inserted.attemptNo,
      totalQuestions: inserted.totalQuestions,
      correctCount:   inserted.correctCount,
      scorePercent:   inserted.scorePercent,
      passMark:       inserted.passMark,
      passed:         inserted.passed,
      durationSeconds:inserted.durationSeconds,
      startedAt:      inserted.startedAt,
      submittedAt:    inserted.submittedAt,
      answers:        inserted.answers,
    });
  }
}
