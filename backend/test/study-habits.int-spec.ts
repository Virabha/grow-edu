import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { eq, and } from "drizzle-orm";

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from "./support/test-database";
import { createTestApp, authHeader, TestActor } from "./support/test-app";
import { TestClock } from "./support/test-clock";
import {
  createUser,
  createBatch,
  enrol,
  createSubject,
  createLesson,
} from "./support/factories";
import {
  studyTimeSessions,
  studyTimeDailyTotals,
  studyStreaks,
  studentBadges,
  weeklyReportCards,
  parentLinks,
  notifications,
} from "../src/database/schema";
import { JOB_QUEUE } from "../src/jobs/job-queue";
import { InlineJobQueue } from "../src/jobs/inline-job-queue";

describe("study habits (tickets 17-20)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.set("2026-08-17T09:00:00.000Z");
    await truncateAll(database);
    admin = await createUser(database, "PLATFORM_ADMIN");
    student = await createUser(database, "LEARNER");
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    subjectId = await createSubject(database, batchId);
    lessonId = await createLesson(database, subjectId);
    await request(app.getHttpServer())
      .put("/settings/studyHabits")
      .set(...authHeader(app, admin))
      .send({ inactivityCutoffSeconds: 300, defaultDailyGoalMinutes: 30 })
      .expect(200);
  });

  function postEvent(
    actor: TestActor,
    body: Record<string, unknown> = {},
    expectedStatus = 201,
  ) {
    return request(app.getHttpServer())
      .post("/habits/study/event")
      .set(...authHeader(app, actor))
      .send({ batchId, subjectId, lessonId, ...body })
      .expect(expectedStatus);
  }

  function getSummary(actor: TestActor, query = "") {
    return request(app.getHttpServer())
      .get(`/habits/study/summary${query}`)
      .set(...authHeader(app, actor))
      .expect(200);
  }

  function getStreak(actor: TestActor) {
    return request(app.getHttpServer())
      .get("/habits/streak")
      .set(...authHeader(app, actor))
      .expect(200);
  }

  function putGoal(actor: TestActor, dailyGoalMinutes: number) {
    return request(app.getHttpServer())
      .put("/habits/goal")
      .set(...authHeader(app, actor))
      .send({ dailyGoalMinutes })
      .expect(200);
  }

  function getGoal(actor: TestActor) {
    return request(app.getHttpServer())
      .get("/habits/goal")
      .set(...authHeader(app, actor))
      .expect(200);
  }

  function getBadges(actor: TestActor) {
    return request(app.getHttpServer())
      .get("/habits/badges")
      .set(...authHeader(app, actor))
      .expect(200);
  }

  describe("Ticket 17 — Study time measurement", () => {
    it("creates a session on first event", async () => {
      await postEvent(student);

      const sessions = await database.db
        .select()
        .from(studyTimeSessions)
        .where(eq(studyTimeSessions.userId, student.userId));

      expect(sessions).toHaveLength(1);
      expect(sessions[0].closedAt).toBeNull();
      expect(sessions[0].accruedSeconds).toBe(0);
    });

    it("accrues time when the gap is within the inactivity cutoff", async () => {
      await postEvent(student);

      clock.advance(60_000);
      const { body } = await postEvent(student);

      expect(body.accruedSeconds).toBe(60);

      const totals = await database.db
        .select()
        .from(studyTimeDailyTotals)
        .where(eq(studyTimeDailyTotals.userId, student.userId));

      const totalSeconds = totals.reduce((acc, r) => acc + r.seconds, 0);
      expect(totalSeconds).toBe(60);
    });

    it("does not accrue time when the gap exceeds the inactivity cutoff", async () => {
      await postEvent(student);

      clock.advance(10 * 60_000);
      const { body } = await postEvent(student);

      expect(body.accruedSeconds).toBe(0);

      const sessions = await database.db
        .select()
        .from(studyTimeSessions)
        .where(eq(studyTimeSessions.userId, student.userId));

      expect(sessions).toHaveLength(2);
      expect(sessions.find((s) => s.closedAt !== null)).toBeDefined();
    });

    it("attributes accrued time to the subject and batch", async () => {
      await postEvent(student);
      clock.advance(90_000);
      await postEvent(student);

      const totals = await database.db
        .select()
        .from(studyTimeDailyTotals)
        .where(
          and(
            eq(studyTimeDailyTotals.userId, student.userId),
            eq(studyTimeDailyTotals.batchId, batchId),
            eq(studyTimeDailyTotals.subjectId, subjectId),
          ),
        );

      expect(totals).toHaveLength(1);
      expect(totals[0].seconds).toBe(90);
    });

    it("summary endpoint returns total and subject breakdown", async () => {
      await postEvent(student);
      clock.advance(120_000);
      await postEvent(student);

      const { body } = await getSummary(student);
      expect(body.totalSeconds).toBe(120);
      expect(body.bySubject).toHaveLength(1);
      expect(body.bySubject[0].seconds).toBe(120);
    });

    it("cutoff is owner-managed and can be changed via settings", async () => {
      await request(app.getHttpServer())
        .put("/settings/studyHabits")
        .set(...authHeader(app, admin))
        .send({ inactivityCutoffSeconds: 30 })
        .expect(200);

      await postEvent(student);
      clock.advance(31_000);
      const { body } = await postEvent(student);

      expect(body.accruedSeconds).toBe(0);

      const sessions = await database.db
        .select()
        .from(studyTimeSessions)
        .where(eq(studyTimeSessions.userId, student.userId));
      expect(sessions).toHaveLength(2);
    });

    it("totals are driven by the injected clock", async () => {
      clock.set("2026-08-17T23:59:30.000Z");
      await postEvent(student);
      clock.advance(60_000);
      await postEvent(student);

      const totals = await database.db
        .select()
        .from(studyTimeDailyTotals)
        .where(eq(studyTimeDailyTotals.userId, student.userId));

      const totalSeconds = totals.reduce((acc, r) => acc + r.seconds, 0);
      expect(totalSeconds).toBe(60);
    });
  });

  describe("Ticket 18 — Streaks and the daily goal", () => {
    it("goal defaults from owner configuration", async () => {
      const { body } = await getGoal(student);
      expect(body.dailyGoalMinutes).toBe(30);
      expect(body.isDefault).toBe(true);
    });

    it("student can set their own goal", async () => {
      await putGoal(student, 45);
      const { body } = await getGoal(student);
      expect(body.dailyGoalMinutes).toBe(45);
      expect(body.isDefault).toBe(false);
    });

    it("meeting the daily goal increments the streak", async () => {
      await putGoal(student, 1);

      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      const { body } = await getStreak(student);
      expect(body.currentStreak).toBe(1);
    });

    it("activity without meeting the goal does not start a streak", async () => {
      await putGoal(student, 60);

      await postEvent(student);
      clock.advance(10_000);
      await postEvent(student);

      const { body } = await getStreak(student);
      expect(body.currentStreak).toBe(0);
    });

    it("opening the app (event) without meeting goal does not extend streak", async () => {
      await putGoal(student, 1);

      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      expect((await getStreak(student)).body.currentStreak).toBe(1);

      clock.set("2026-08-18T09:00:00.000Z");
      await postEvent(student);

      expect((await getStreak(student)).body.currentStreak).toBe(1);
    });

    it("a missed day breaks the streak — next qualifying day starts at 1", async () => {
      await putGoal(student, 1);

      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      clock.set("2026-08-19T09:00:00.000Z");
      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      const { body } = await getStreak(student);
      expect(body.currentStreak).toBe(1);
    });

    it("consecutive qualifying days build a streak across the day boundary", async () => {
      await putGoal(student, 1);

      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      clock.set("2026-08-18T09:00:00.000Z");
      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      const { body } = await getStreak(student);
      expect(body.currentStreak).toBe(2);
    });

    it("longest streak is preserved even after a break", async () => {
      await putGoal(student, 1);

      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      clock.set("2026-08-18T09:00:00.000Z");
      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      clock.set("2026-08-20T09:00:00.000Z");
      await postEvent(student);
      clock.advance(65_000);
      await postEvent(student);

      const { body } = await getStreak(student);
      expect(body.longestStreak).toBe(2);
      expect(body.currentStreak).toBe(1);
    });
  });

  describe("Ticket 19 — Badges for milestones", () => {
    it("awards STUDY_MINUTES_TOTAL badge when threshold is met", async () => {
      await request(app.getHttpServer())
        .put("/settings/studyHabits")
        .set(...authHeader(app, admin))
        .send({ badgeStudyMinutesTotal: 1 })
        .expect(200);

      await postEvent(student);
      clock.advance(62_000);
      await postEvent(student);

      const badges = await database.db
        .select()
        .from(studentBadges)
        .where(
          and(
            eq(studentBadges.userId, student.userId),
            eq(studentBadges.badgeKey, "STUDY_MINUTES_TOTAL"),
          ),
        );
      expect(badges).toHaveLength(1);
    });

    it("does not award a badge twice on repeated evaluation", async () => {
      await request(app.getHttpServer())
        .put("/settings/studyHabits")
        .set(...authHeader(app, admin))
        .send({ badgeStudyMinutesTotal: 1 })
        .expect(200);

      await postEvent(student);
      clock.advance(62_000);
      await postEvent(student);

      clock.advance(62_000);
      await postEvent(student);

      const badges = await database.db
        .select()
        .from(studentBadges)
        .where(
          and(
            eq(studentBadges.userId, student.userId),
            eq(studentBadges.badgeKey, "STUDY_MINUTES_TOTAL"),
          ),
        );
      expect(badges).toHaveLength(1);
    });

    it("badge criteria are owner-managed configuration, not code literals", async () => {
      const { body: before } = await getBadges(student);
      const beforeKeys = (
        before.earned as Array<{ badgeKey: string }>
      ).map((b) => b.badgeKey);
      expect(beforeKeys).not.toContain("STUDY_MINUTES_TOTAL");

      await request(app.getHttpServer())
        .put("/settings/studyHabits")
        .set(...authHeader(app, admin))
        .send({ badgeStudyMinutesTotal: 1 })
        .expect(200);

      await postEvent(student);
      clock.advance(62_000);
      await postEvent(student);

      const { body: after } = await getBadges(student);
      const afterKeys = (
        after.earned as Array<{ badgeKey: string }>
      ).map((b) => b.badgeKey);
      expect(afterKeys).toContain("STUDY_MINUTES_TOTAL");
    });

    it("list shows earned badges and still-available badges", async () => {
      const { body } = await getBadges(student);

      expect(Array.isArray(body.earned)).toBe(true);
      expect(Array.isArray(body.available)).toBe(true);
      expect(body.available.length).toBeGreaterThan(0);
      expect(
        (body.available as Array<{ badgeKey: string }>).every(
          (b) => typeof b.badgeKey === "string",
        ),
      ).toBe(true);
    });

    it("awarding is recorded with the clock time it happened", async () => {
      await request(app.getHttpServer())
        .put("/settings/studyHabits")
        .set(...authHeader(app, admin))
        .send({ badgeStudyMinutesTotal: 1 })
        .expect(200);

      clock.set("2026-08-17T10:05:00.000Z");
      await postEvent(student);
      clock.advance(62_000);
      await postEvent(student);

      const badges = await database.db
        .select()
        .from(studentBadges)
        .where(eq(studentBadges.userId, student.userId));

      const badge = badges.find((b) => b.badgeKey === "STUDY_MINUTES_TOTAL");
      expect(badge).toBeDefined();
      expect(badge?.awardedAt.toISOString().slice(0, 16)).toBe(
        "2026-08-17T10:06",
      );
    });
  });

  describe("Ticket 20 — Weekly report card", () => {
    it("job generates a report for enrolled students", async () => {
      await postEvent(student);
      clock.advance(60_000);
      await postEvent(student);

      clock.set("2026-08-24T09:00:00.000Z");
      await queue.enqueue("habits.report-card.weekly", undefined);

      const reports = await database.db
        .select()
        .from(weeklyReportCards)
        .where(eq(weeklyReportCards.userId, student.userId));

      expect(reports).toHaveLength(1);
      expect(reports[0].hadActivity).toBe(true);
    });

    it("report is produced by a queued job, not a request", async () => {
      clock.set("2026-08-24T09:00:00.000Z");

      const before = await database.db
        .select()
        .from(weeklyReportCards)
        .where(eq(weeklyReportCards.userId, student.userId));
      expect(before).toHaveLength(0);

      await queue.enqueue("habits.report-card.weekly", undefined);

      const after = await database.db
        .select()
        .from(weeklyReportCards)
        .where(eq(weeklyReportCards.userId, student.userId));
      expect(after).toHaveLength(1);
    });

    it("sends notification to the student", async () => {
      await postEvent(student);
      clock.advance(60_000);
      await postEvent(student);

      clock.set("2026-08-24T09:00:00.000Z");
      await queue.enqueue("habits.report-card.weekly", undefined);

      const studentNotifications = await database.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, student.userId),
            eq(notifications.type, "WEEKLY_REPORT_CARD"),
          ),
        );

      expect(studentNotifications.length).toBeGreaterThanOrEqual(1);
    });

    it("sends notification to any linked parent", async () => {
      const parent = await createUser(database, "PARENT");

      await database.db.insert(parentLinks).values({
        parentUserId: parent.userId,
        studentUserId: student.userId,
        status: "ACTIVE",
        requestedAt: clock.now(),
      });

      await postEvent(student);
      clock.advance(60_000);
      await postEvent(student);

      clock.set("2026-08-24T09:00:00.000Z");
      await queue.enqueue("habits.report-card.weekly", undefined);

      const parentNotifications = await database.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, parent.userId),
            eq(notifications.type, "WEEKLY_REPORT_CARD"),
          ),
        );

      expect(parentNotifications).toHaveLength(1);
    });

    it("running the job twice does not send twice", async () => {
      await postEvent(student);
      clock.advance(60_000);
      await postEvent(student);

      clock.set("2026-08-24T09:00:00.000Z");
      await queue.enqueue("habits.report-card.weekly", undefined);
      await queue.enqueue("habits.report-card.weekly", undefined);

      const reports = await database.db
        .select()
        .from(weeklyReportCards)
        .where(eq(weeklyReportCards.userId, student.userId));

      expect(reports).toHaveLength(1);

      const studentNotifications = await database.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, student.userId),
            eq(notifications.type, "WEEKLY_REPORT_CARD"),
          ),
        );

      expect(studentNotifications).toHaveLength(1);
    });

    it("student with no activity gets a report with hadActivity=false and an informative summary", async () => {
      clock.set("2026-08-24T09:00:00.000Z");
      await queue.enqueue("habits.report-card.weekly", undefined);

      const reports = await database.db
        .select()
        .from(weeklyReportCards)
        .where(eq(weeklyReportCards.userId, student.userId));

      expect(reports).toHaveLength(1);
      expect(reports[0].hadActivity).toBe(false);

      const payload = reports[0].payload as Record<string, unknown>;
      expect(typeof payload.summary).toBe("string");
      expect((payload.summary as string).toLowerCase()).toContain("no");
    });

    it("report uses the injected clock for generatedAt", async () => {
      const generationTime = "2026-08-24T09:00:00.000Z";
      clock.set(generationTime);
      await queue.enqueue("habits.report-card.weekly", undefined);

      const reports = await database.db
        .select()
        .from(weeklyReportCards)
        .where(eq(weeklyReportCards.userId, student.userId));

      expect(reports[0].generatedAt.toISOString().slice(0, 16)).toBe(
        generationTime.slice(0, 16),
      );
    });

    it("reuses the notification template system", async () => {
      clock.set("2026-08-24T09:00:00.000Z");
      await queue.enqueue("habits.report-card.weekly", undefined);

      const notifs = await database.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, student.userId),
            eq(notifications.type, "WEEKLY_REPORT_CARD"),
          ),
        );

      expect(notifs).toHaveLength(1);
      expect(notifs[0].title).toBe("Your weekly study report");
    });
  });
});
