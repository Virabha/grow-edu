import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and, desc, sql, gte, isNull } from 'drizzle-orm';
import { FilesService } from '../files/files.service';

// timeSpent is stored in SECONDS in both lessonProgress.timeSpent and
// courseProgress.timeSpent. The UpdateProgressDto example is timeSpent: 300
// (seconds) alongside lastPosition: 120 (seconds). Dividing by 60 converts to
// minutes for dashboard display.
const SECONDS_PER_MINUTE = 60;

// ─── Response shape mirrors the frontend contract exactly ─────────────────────
// Sources: use-dashboard.ts, use-enrollments.ts, use-orders.ts, use-quiz-attempts.ts

interface CourseStub {
  courseId: string;
  title: string;
  slug: string;
  description: string | undefined;
  shortDescription: string | null;
  thumbnail: string | null;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  categoryId: string;
  instructorId: string;
  level: string | undefined;
  language: string | undefined;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentDto {
  enrollmentId: string;
  userId: string;
  courseId: string;
  status: string;
  accessType: string;
  enrolledAt: string;
  course?: CourseStub;
  accessedSections: never[]; // [Q] not stored on enrollments; always [] for dashboard
  progressPercent: number;
  lessonsCompleted: number; // [Q] per-enrollment count would require N+1; fixed to 0 for dashboard list
  lastAccessedAt: string | null;
}

type OrderGateway = 'RAZORPAY' | 'MANUAL_QR' | 'FREE';
type OrderStatus = 'COMPLETED' | 'PENDING' | 'PROOF_UPLOADED' | 'FAILED' | 'REFUNDED';
type RefundStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'DECLINED';

export interface OrderDto {
  orderId: string;
  invoiceNo: string; // [Q] no invoice numbering table in schema; defaults to ''
  items: never[]; // [Q] no line-item breakdown table; defaults to []
  subtotal: number;
  discount: number;
  tax: number; // [Q] no tax field in payments schema; defaults to 0
  total: number;
  currency: string;
  gateway: OrderGateway;
  status: OrderStatus;
  refundStatus: RefundStatus; // [Q] no refund status field in payments; defaults to 'NONE'
  refundReason: string | null; // [Q] no refund reason field; defaults to null
  transactionId: string | null;
  placedAt: string;
  billingName: string;
  billingEmail: string;
}

export interface QuizAttemptDto {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  courseId: string; // [Q] batchQuizzes link to batches, not courses; defaults to ''
  courseTitle: string; // [Q] same; defaults to ''
  lessonTitle: string; // [Q] no lesson concept in batch quiz system; defaults to ''
  totalQuestions: number; // [Q] would need COUNT on batchQuizQuestions per attempt; defaults to 0
  correctCount: number;
  scorePercent: number;
  passMark: number;
  passed: boolean;
  durationSeconds: number; // computed from submittedAt - startedAt (both available)
  attemptNo: number; // [Q] per-user attempt ordering not stored; defaults to 1
  submittedAt: string;
  answers: never[]; // [Q] schema stores answers as Record<string,unknown>, not QuizAnswer[]; defaults to []
}

export interface DashboardStats {
  enrolledCount: number;
  activeCount: number;
  completedCount: number;
  lessonsCompleted: number;
  quizzesAttempted: number;
  averageQuizScore: number;
  certificatesEarned: number;
  totalSpend: number;
  currency: string;
  studyStreakDays: number;
  studyMinutesThisWeek: number;
}

export interface DashboardSummary {
  stats: DashboardStats;
  activity: { day: string; minutes: number }[];
  continueLearning: EnrollmentDto[];
  recentAttempts: QuizAttemptDto[];
  recentOrders: OrderDto[];
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly filesService: FilesService,
  ) {}

  private ensureThumbnailUrl(thumbnail: string | null | undefined): string | null {
    if (!thumbnail) return null;
    if (thumbnail.startsWith('http')) return thumbnail;
    return this.filesService.getDownloadUrl(thumbnail);
  }

  async getSummary(userId: string): Promise<DashboardSummary> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Batch 1: five aggregate stats queries run concurrently ────────────────
    const [
      enrollCountsArr,
      lessonCountsArr,
      quizStatsArr,
      certCountsArr,
      spendRowArr,
    ] = await Promise.all([
      // Q1: Enrollment counts by status
      this.db
        .select({
          enrolledCount: sql<number>`COUNT(*)::int`,
          activeCount:
            sql<number>`COUNT(*) FILTER (WHERE ${schema.enrollments.status} = 'ACTIVE')::int`,
          completedCount:
            sql<number>`COUNT(*) FILTER (WHERE ${schema.enrollments.status} = 'COMPLETED')::int`,
        })
        .from(schema.enrollments)
        .where(eq(schema.enrollments.userId, userId)),

      // Q2: Total lessons completed across all courses (via courseProgress join)
      this.db
        .select({
          lessonsCompleted: sql<number>`COUNT(*)::int`,
        })
        .from(schema.lessonProgress)
        .innerJoin(
          schema.courseProgress,
          eq(schema.lessonProgress.progressId, schema.courseProgress.courseProgressId),
        )
        .where(
          and(
            eq(schema.courseProgress.userId, userId),
            eq(schema.lessonProgress.completed, true),
          ),
        ),

      // Q3: Quiz attempt count and average score (submitted attempts only)
      this.db
        .select({
          quizzesAttempted: sql<number>`COUNT(*)::int`,
          // Decimal columns (score, maxScore) return strings; cast to numeric for division
          avgScoreRaw: sql<string | null>`AVG(
            CASE WHEN ${schema.batchQuizAttempts.maxScore}::numeric > 0
              THEN ${schema.batchQuizAttempts.score}::numeric
                   / ${schema.batchQuizAttempts.maxScore}::numeric * 100
              ELSE 0
            END
          )`,
        })
        .from(schema.batchQuizAttempts)
        .where(
          and(
            eq(schema.batchQuizAttempts.userId, userId),
            eq(
              schema.batchQuizAttempts.status,
              'SUBMITTED' as 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED',
            ),
          ),
        ),

      // Q4a: Certificates earned (excluding revoked)
      this.db
        .select({
          certificatesEarned: sql<number>`COUNT(*)::int`,
        })
        .from(schema.batchCertificates)
        .where(
          and(
            eq(schema.batchCertificates.userId, userId),
            // isNull() is required — eq(col, null) compiles to `= NULL` and matches nothing
            isNull(schema.batchCertificates.revokedAt),
          ),
        ),

      // Q4b: Total spend from completed payments (decimal amount → string from DB)
      this.db
        .select({
          totalSpendRaw: sql<string | null>`SUM(${schema.payments.amount})`,
          currency: sql<string | null>`MAX(${schema.payments.currency})`,
        })
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.userId, userId),
            eq(
              schema.payments.status,
              'COMPLETED' as
                | 'PENDING'
                | 'PROOF_UPLOADED'
                | 'COMPLETED'
                | 'FAILED'
                | 'REJECTED'
                | 'REFUNDED',
            ),
          ),
        ),
    ]);

    // ── Batch 2: four list queries run concurrently ───────────────────────────
    const [activityRaw, continueLearningRaw, recentAttemptsRaw, recentOrdersRaw] =
      await Promise.all([
        // Q5: Daily study time for last 30 days — used for both activity[] and streak
        // timeSpent is in SECONDS; divide by 60 in JS for minutes
        this.db
          .select({
            day: sql<string>`DATE(${schema.lessonProgress.lastAccessed} AT TIME ZONE 'UTC')::text`,
            totalSeconds: sql<number>`SUM(${schema.lessonProgress.timeSpent})::int`,
          })
          .from(schema.lessonProgress)
          .innerJoin(
            schema.courseProgress,
            eq(
              schema.lessonProgress.progressId,
              schema.courseProgress.courseProgressId,
            ),
          )
          .where(
            and(
              eq(schema.courseProgress.userId, userId),
              gte(schema.lessonProgress.lastAccessed, thirtyDaysAgo),
            ),
          )
          .groupBy(
            sql`DATE(${schema.lessonProgress.lastAccessed} AT TIME ZONE 'UTC')`,
          )
          .orderBy(
            sql`DATE(${schema.lessonProgress.lastAccessed} AT TIME ZONE 'UTC') DESC`,
          ),

        // Q6: Active enrollments + course + progress for "continue learning"
        this.db
          .select({
            enrollmentId: schema.enrollments.enrollmentId,
            userId: schema.enrollments.userId,
            courseId: schema.enrollments.courseId,
            status: schema.enrollments.status,
            enrolledAt: schema.enrollments.enrolledAt,
            progress: schema.courseProgress.progress,
            lastAccessed: schema.courseProgress.lastAccessed,
            courseTitle: schema.courses.title,
            courseSlug: schema.courses.slug,
            courseDescription: schema.courses.description,
            courseShortDescription: schema.courses.shortDescription,
            courseThumbnail: schema.courses.thumbnail,
            coursePrice: schema.courses.price,
            courseCompareAtPrice: schema.courses.compareAtPrice,
            courseCurrency: schema.courses.currency,
            courseCategoryId: schema.courses.categoryId,
            courseInstructorId: schema.courses.instructorId,
            courseLevel: schema.courses.level,
            courseLanguage: schema.courses.language,
            courseStatus: schema.courses.status,
            courseCreatedAt: schema.courses.createdAt,
            courseUpdatedAt: schema.courses.updatedAt,
          })
          .from(schema.enrollments)
          .leftJoin(
            schema.courseProgress,
            and(
              eq(schema.courseProgress.userId, schema.enrollments.userId),
              eq(schema.courseProgress.courseId, schema.enrollments.courseId),
            ),
          )
          .leftJoin(
            schema.courses,
            eq(schema.courses.courseId, schema.enrollments.courseId),
          )
          .where(
            and(
              eq(schema.enrollments.userId, userId),
              eq(
                schema.enrollments.status,
                'ACTIVE' as 'ACTIVE' | 'COMPLETED' | 'REVOKED',
              ),
            ),
          )
          // NULLs sort last by default in PostgreSQL DESC — enrollments with no
          // progress appear at the end of the list, which is the desired behaviour
          .orderBy(desc(schema.courseProgress.lastAccessed))
          .limit(3),

        // Q7: Most recent submitted quiz attempts with quiz metadata
        this.db
          .select({
            attemptId: schema.batchQuizAttempts.attemptId,
            quizId: schema.batchQuizAttempts.quizId,
            startedAt: schema.batchQuizAttempts.startedAt,
            submittedAt: schema.batchQuizAttempts.submittedAt,
            score: schema.batchQuizAttempts.score,
            maxScore: schema.batchQuizAttempts.maxScore,
            correctCount: schema.batchQuizAttempts.correctCount,
            quizTitle: schema.batchQuizzes.title,
            passingPercent: schema.batchQuizzes.passingPercent,
          })
          .from(schema.batchQuizAttempts)
          .innerJoin(
            schema.batchQuizzes,
            eq(schema.batchQuizAttempts.quizId, schema.batchQuizzes.quizId),
          )
          .where(
            and(
              eq(schema.batchQuizAttempts.userId, userId),
              eq(
                schema.batchQuizAttempts.status,
                'SUBMITTED' as 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED',
              ),
            ),
          )
          .orderBy(desc(schema.batchQuizAttempts.submittedAt))
          .limit(3),

        // Q8: Most recent completed payments joined to users for billing email
        this.db
          .select({
            paymentId: schema.payments.paymentId,
            amount: schema.payments.amount,
            originalAmount: schema.payments.originalAmount,
            discountAmount: schema.payments.discountAmount,
            currency: schema.payments.currency,
            gateway: schema.payments.gateway,
            status: schema.payments.status,
            transactionId: schema.payments.transactionId,
            createdAt: schema.payments.createdAt,
            payerName: schema.payments.payerName,
            userEmail: schema.users.email,
          })
          .from(schema.payments)
          .innerJoin(schema.users, eq(schema.payments.userId, schema.users.userId))
          .where(
            and(
              eq(schema.payments.userId, userId),
              eq(
                schema.payments.status,
                'COMPLETED' as
                  | 'PENDING'
                  | 'PROOF_UPLOADED'
                  | 'COMPLETED'
                  | 'FAILED'
                  | 'REJECTED'
                  | 'REFUNDED',
              ),
            ),
          )
          .orderBy(desc(schema.payments.createdAt))
          .limit(3),
      ]);

    // ── Destructure first rows from aggregate queries ─────────────────────────
    const enrollCounts = enrollCountsArr[0];
    const lessonCounts = lessonCountsArr[0];
    const quizStats = quizStatsArr[0];
    const certCounts = certCountsArr[0];
    const spendRow = spendRowArr[0];

    // ── Activity and streak (both derived from same 30-day window, Q5) ────────
    const daySecondsMap = new Map<string, number>();
    for (const row of activityRaw) {
      daySecondsMap.set(row.day, row.totalSeconds ?? 0);
    }

    const activity = DashboardService.buildActivityArray(daySecondsMap, now);
    const studyMinutesThisWeek = activity.reduce((s, d) => s + d.minutes, 0);
    const studyStreakDays = DashboardService.computeStreak(
      Array.from(daySecondsMap.keys()),
      now,
    );

    // ── Assemble stats ────────────────────────────────────────────────────────
    const stats: DashboardStats = {
      enrolledCount: enrollCounts?.enrolledCount ?? 0,
      activeCount: enrollCounts?.activeCount ?? 0,
      completedCount: enrollCounts?.completedCount ?? 0,
      lessonsCompleted: lessonCounts?.lessonsCompleted ?? 0,
      quizzesAttempted: quizStats?.quizzesAttempted ?? 0,
      // avgScoreRaw is a PostgreSQL numeric returned as string; Number() converts it
      averageQuizScore: Math.round(Number(quizStats?.avgScoreRaw ?? '0') || 0),
      certificatesEarned: certCounts?.certificatesEarned ?? 0,
      // payments.amount is decimal → string from DB; Number() converts
      totalSpend: Number(spendRow?.totalSpendRaw ?? '0') || 0,
      currency: spendRow?.currency ?? 'INR',
      studyStreakDays,
      studyMinutesThisWeek,
    };

    // ── continueLearning ──────────────────────────────────────────────────────
    const continueLearning: EnrollmentDto[] = continueLearningRaw.map((row) => ({
      enrollmentId: row.enrollmentId,
      userId: row.userId,
      courseId: row.courseId,
      status: row.status,
      accessType: 'COURSE_PURCHASE', // [Q] accessType not in enrollments schema
      enrolledAt: row.enrolledAt.toISOString(),
      course:
        row.courseTitle != null
          ? {
              courseId: row.courseId,
              title: row.courseTitle,
              slug: row.courseSlug ?? '',
              description: row.courseDescription ?? undefined,
              shortDescription: row.courseShortDescription ?? null,
              thumbnail: this.ensureThumbnailUrl(row.courseThumbnail),
              price: row.coursePrice ?? '0',
              compareAtPrice: row.courseCompareAtPrice ?? null,
              currency: row.courseCurrency ?? 'INR',
              categoryId: row.courseCategoryId ?? '',
              instructorId: row.courseInstructorId ?? '',
              level: row.courseLevel ?? undefined,
              language: row.courseLanguage ?? undefined,
              status: row.courseStatus ?? 'DRAFT',
              createdAt: row.courseCreatedAt?.toISOString() ?? '',
              updatedAt: row.courseUpdatedAt?.toISOString() ?? '',
            }
          : undefined,
      accessedSections: [], // [Q] not stored on enrollments; always [] for dashboard
      // courseProgress.progress is decimal → string from DB; Number() converts
      progressPercent: Number(row.progress ?? '0'),
      lessonsCompleted: 0, // [Q] per-enrollment count requires extra subquery; skip for dashboard list
      lastAccessedAt: row.lastAccessed?.toISOString() ?? null,
    }));

    // ── recentAttempts ────────────────────────────────────────────────────────
    const recentAttempts: QuizAttemptDto[] = recentAttemptsRaw.map((row) => {
      // score and maxScore are decimal columns → strings from DB
      const score = Number(row.score ?? '0');
      const maxScore = Number(row.maxScore ?? '0');
      const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      // passingPercent is decimal → string from DB
      const passMark = Number(row.passingPercent ?? '40');
      // durationSeconds computed from DB timestamps (both available on submitted attempts)
      const durationSeconds =
        row.submittedAt != null
          ? Math.max(
              0,
              Math.floor((row.submittedAt.getTime() - row.startedAt.getTime()) / 1000),
            )
          : 0;

      return {
        attemptId: row.attemptId,
        quizId: row.quizId,
        quizTitle: row.quizTitle,
        courseId: '', // [Q] batchQuizzes belong to batches, not courses
        courseTitle: '', // [Q] same
        lessonTitle: '', // [Q] no lesson concept in batch quiz system
        totalQuestions: 0, // [Q] would need COUNT on batchQuizQuestions; omitted to avoid N+1
        correctCount: row.correctCount ?? 0,
        scorePercent,
        passMark,
        passed: scorePercent >= passMark,
        durationSeconds,
        attemptNo: 1, // [Q] per-user attempt sequence not stored; defaults to 1
        submittedAt: row.submittedAt?.toISOString() ?? new Date().toISOString(),
        answers: [], // [Q] schema stores answers as Record<string,unknown>, not QuizAnswer[]
      };
    });

    // ── recentOrders ──────────────────────────────────────────────────────────
    const recentOrders: OrderDto[] = recentOrdersRaw.map((row) => {
      // Map gateway: schema includes PHONEPE which is absent from frontend's Order.gateway union
      const gw = row.gateway;
      const gateway: OrderGateway =
        gw === 'RAZORPAY' || gw === 'MANUAL_QR' || gw === 'FREE'
          ? gw
          : 'MANUAL_QR'; // PHONEPE → MANUAL_QR [Q] frontend Order.gateway has no PHONEPE

      return {
        orderId: row.paymentId,
        invoiceNo: '', // [Q] no invoice numbering in payments schema
        items: [], // [Q] no per-item breakdown table; would need course/section join per payment
        subtotal: Number(row.originalAmount ?? row.amount),
        discount: Number(row.discountAmount ?? '0'),
        tax: 0, // [Q] no tax column in payments schema
        total: Number(row.amount),
        currency: row.currency,
        gateway,
        status: row.status as OrderStatus, // filtered to COMPLETED above; safe single cast
        refundStatus: 'NONE' as RefundStatus, // [Q] no refund status tracking in payments
        refundReason: null, // [Q] no refund reason field
        transactionId: row.transactionId,
        placedAt: row.createdAt.toISOString(),
        billingName: row.payerName ?? '',
        billingEmail: row.userEmail,
      };
    });

    return { stats, activity, continueLearning, recentAttempts, recentOrders };
  }

  /**
   * Builds exactly 7 activity entries covering the last 7 days (oldest → newest).
   * Days with no study activity get `minutes: 0`.
   * timeSpent from DB is in SECONDS; this method converts to MINUTES.
   */
  static buildActivityArray(
    daySecondsMap: Map<string, number>,
    now: Date,
  ): { day: string; minutes: number }[] {
    const result: { day: string; minutes: number }[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - offset);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const seconds = daySecondsMap.get(key) ?? 0;
      result.push({ day: key, minutes: Math.floor(seconds / SECONDS_PER_MINUTE) });
    }
    return result;
  }

  /**
   * Computes consecutive study-day streak ending today (or yesterday if today has no data).
   * @param days Array of YYYY-MM-DD strings that had any lesson progress.
   * @param now  Reference "now" (injected so tests are deterministic).
   */
  static computeStreak(days: string[], now: Date): number {
    if (days.length === 0) return 0;

    const daySet = new Set(days);
    const today = now.toISOString().slice(0, 10);

    // If today has no activity, try starting from yesterday
    let startDay: string;
    if (daySet.has(today)) {
      startDay = today;
    } else {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      startDay = yesterday.toISOString().slice(0, 10);
    }

    let streak = 0;
    let current = startDay;
    while (daySet.has(current)) {
      streak++;
      const prev = new Date(current + 'T00:00:00Z');
      prev.setUTCDate(prev.getUTCDate() - 1);
      current = prev.toISOString().slice(0, 10);
    }

    return streak;
  }
}
