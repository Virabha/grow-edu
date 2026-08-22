import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentTests,
  batchSessions,
  batchSubjects,
  curriculumTestPlacements,
  lessons,
  subjectLessons,
} from "../../database/schema";
import { CLOCK, Clock } from "../../common/clock";
import { BatchAccessService, Viewer } from "../access/batch-access.service";

type CurriculumItem = {
  kind: "LESSON" | "TEST";
  placementId: string;
  order: number;
  title: string;
  type: string;
  lessonId: string | null;
  testId: string | null;
  sessionId: string | null;
  scheduledStartAt: Date | null;
  locked: boolean;
  unlocksAt: Date | null;
};

@Injectable()
export class CurriculumService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async unified(batchId: string, viewer: Viewer) {
    const access = await this.access.require(batchId, viewer, "READ");
    const subjects = await this.db
      .select()
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      )
      .orderBy(asc(batchSubjects.displayOrder));

    if (subjects.length === 0) return [];
    const subjectIds = subjects.map((subject) => subject.subjectId);

    const [lessonRows, testRows] = await Promise.all([
      this.db
        .select({
          placementId: subjectLessons.placementId,
          subjectId: subjectLessons.subjectId,
          order: subjectLessons.order,
          unlockAt: subjectLessons.unlockAt,
          unlockAfterDays: subjectLessons.unlockAfterDays,
          lessonId: lessons.lessonId,
          title: lessons.title,
          type: lessons.type,
          status: lessons.status,
          isFreePreview: lessons.isFreePreview,
          sessionId: lessons.sessionId,
        })
        .from(subjectLessons)
        .innerJoin(lessons, eq(lessons.lessonId, subjectLessons.lessonId))
        .where(
          and(
            inArray(subjectLessons.subjectId, subjectIds),
            eq(subjectLessons.isDeleted, false),
            eq(lessons.isDeleted, false),
          ),
        ),
      this.db
        .select({
          placementId: curriculumTestPlacements.placementId,
          subjectId: curriculumTestPlacements.subjectId,
          order: curriculumTestPlacements.order,
          unlockAt: curriculumTestPlacements.unlockAt,
          unlockAfterDays: curriculumTestPlacements.unlockAfterDays,
          testId: assessmentTests.testId,
          title: assessmentTests.title,
          publishedAt: assessmentTests.publishedAt,
        })
        .from(curriculumTestPlacements)
        .innerJoin(
          assessmentTests,
          eq(assessmentTests.testId, curriculumTestPlacements.testId),
        )
        .where(
          and(
            inArray(curriculumTestPlacements.subjectId, subjectIds),
            eq(curriculumTestPlacements.isDeleted, false),
            eq(assessmentTests.isDeleted, false),
          ),
        ),
    ]);

    const sessionIds = lessonRows
      .map((row) => row.sessionId)
      .filter((id): id is string => id !== null);
    const sessions =
      sessionIds.length === 0
        ? []
        : await this.db
            .select({
              sessionId: batchSessions.sessionId,
              scheduledStartAt: batchSessions.scheduledStartAt,
            })
            .from(batchSessions)
            .where(inArray(batchSessions.sessionId, sessionIds));
    const scheduleOf = new Map(
      sessions.map((session) => [session.sessionId, session.scheduledStartAt]),
    );

    const bySubject = new Map<string, CurriculumItem[]>();
    const push = (subjectId: string, item: CurriculumItem) => {
      const held = bySubject.get(subjectId);
      if (held) held.push(item);
      else bySubject.set(subjectId, [item]);
    };

    for (const row of lessonRows) {
      if (!access.isStaff && row.status !== "READY" && !row.isFreePreview) {
        continue;
      }
      const unlocksAt = access.isStaff
        ? null
        : this.access.unlockTimeFor(
            { unlockAt: row.unlockAt, unlockAfterDays: row.unlockAfterDays },
            access.enrollment,
          );
      push(row.subjectId, {
        kind: "LESSON",
        placementId: row.placementId,
        order: row.order,
        title: row.title,
        type: row.type,
        lessonId: row.lessonId,
        testId: null,
        sessionId: row.sessionId,
        scheduledStartAt:
          row.sessionId === null ? null : scheduleOf.get(row.sessionId) ?? null,
        locked: unlocksAt !== null && unlocksAt > this.clock.now(),
        unlocksAt,
      });
    }

    for (const row of testRows) {
      if (!access.isStaff && row.publishedAt === null) continue;
      const unlocksAt = access.isStaff
        ? null
        : this.access.unlockTimeFor(
            { unlockAt: row.unlockAt, unlockAfterDays: row.unlockAfterDays },
            access.enrollment,
          );
      push(row.subjectId, {
        kind: "TEST",
        placementId: row.placementId,
        order: row.order,
        title: row.title,
        type: "TEST",
        lessonId: null,
        testId: row.testId,
        sessionId: null,
        scheduledStartAt: null,
        locked: unlocksAt !== null && unlocksAt > this.clock.now(),
        unlocksAt,
      });
    }

    return subjects.map((subject) => ({
      subjectId: subject.subjectId,
      name: subject.name,
      items: (bySubject.get(subject.subjectId) ?? []).sort(compareItems),
    }));
  }

  async placeTest(
    batchId: string,
    subjectId: string,
    testId: string,
    order: number,
    unlockAfterDays?: number,
  ) {
    await this.requireSubject(batchId, subjectId);
    const [test] = await this.db
      .select({ testId: assessmentTests.testId, batchId: assessmentTests.batchId })
      .from(assessmentTests)
      .where(
        and(
          eq(assessmentTests.testId, testId),
          eq(assessmentTests.isDeleted, false),
        ),
      );
    if (!test) throw new NotFoundException("No such test");
    if (test.batchId !== null && test.batchId !== batchId) {
      throw new BadRequestException("That test belongs to another batch");
    }

    const now = this.clock.now();
    const [placed] = await this.db
      .insert(curriculumTestPlacements)
      .values({
        subjectId,
        batchId,
        testId,
        order,
        unlockAfterDays: unlockAfterDays ?? null,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [curriculumTestPlacements.subjectId, curriculumTestPlacements.testId],
        set: {
          order,
          unlockAfterDays: unlockAfterDays ?? null,
          isDeleted: false,
        },
      })
      .returning();
    return placed;
  }

  async removeTest(batchId: string, placementId: string) {
    const [removed] = await this.db
      .update(curriculumTestPlacements)
      .set({ isDeleted: true })
      .where(
        and(
          eq(curriculumTestPlacements.placementId, placementId),
          eq(curriculumTestPlacements.batchId, batchId),
        ),
      )
      .returning();
    if (!removed) throw new NotFoundException("No such placement on this batch");
    return { success: true };
  }

  async reorder(
    batchId: string,
    items: { placementId: string; order: number }[],
  ) {
    const subjectIds = await this.subjectIdsFor(batchId);
    if (subjectIds.length === 0) {
      throw new NotFoundException("That batch has no subjects");
    }

    await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(subjectLessons)
          .set({ order: item.order })
          .where(
            and(
              eq(subjectLessons.placementId, item.placementId),
              inArray(subjectLessons.subjectId, subjectIds),
            ),
          );
        await tx
          .update(curriculumTestPlacements)
          .set({ order: item.order })
          .where(
            and(
              eq(curriculumTestPlacements.placementId, item.placementId),
              eq(curriculumTestPlacements.batchId, batchId),
            ),
          );
      }
    });

    return { success: true };
  }

  private async requireSubject(batchId: string, subjectId: string) {
    const [subject] = await this.db
      .select({ subjectId: batchSubjects.subjectId })
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.subjectId, subjectId),
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      );
    if (!subject) throw new NotFoundException("No such subject on this batch");
    return subject;
  }

  private async subjectIdsFor(batchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ subjectId: batchSubjects.subjectId })
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      );
    return rows.map((row) => row.subjectId);
  }
}

function compareItems(left: CurriculumItem, right: CurriculumItem): number {
  if (left.order !== right.order) return left.order - right.order;
  const leftAt = left.scheduledStartAt?.getTime() ?? null;
  const rightAt = right.scheduledStartAt?.getTime() ?? null;
  if (leftAt !== null && rightAt !== null) return leftAt - rightAt;
  if (leftAt !== null) return -1;
  if (rightAt !== null) return 1;
  return left.placementId.localeCompare(right.placementId);
}
