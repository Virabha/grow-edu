import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, or, gt } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchEnrollments,
  batches,
  lessonProgress,
} from "../../database/schema";
import { CLOCK, Clock } from "../../common/clock";
import { SignedInViewer } from "../access/batch-access.service";
import { CurriculumService } from "../catalogue/curriculum.service";

type ContinueItem = {
  batchId: string;
  batchTitle: string;
  batchSlug: string;
  lessonId: string;
  title: string;
  type: string;
  positionSeconds: number;
  completed: boolean;
  lastAccessedAt: Date | null;
  resumed: boolean;
};

@Injectable()
export class ContinueLearningService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly curriculum: CurriculumService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async forViewer(viewer: SignedInViewer): Promise<ContinueItem[]> {
    const now = this.clock.now();
    const enrolments = await this.db
      .select({
        batchId: batches.batchId,
        title: batches.title,
        slug: batches.slug,
        enrolledAt: batchEnrollments.createdAt,
      })
      .from(batchEnrollments)
      .innerJoin(batches, eq(batches.batchId, batchEnrollments.batchId))
      .where(
        and(
          eq(batchEnrollments.userId, viewer.userId),
          eq(batchEnrollments.status, "ACTIVE"),
          eq(batches.isDeleted, false),
          or(
            isNull(batchEnrollments.accessEndsAt),
            gt(batchEnrollments.accessEndsAt, now),
          ),
        ),
      );

    if (enrolments.length === 0) return [];

    const progress = await this.db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, viewer.userId),
          inArray(
            lessonProgress.batchId,
            enrolments.map((enrolment) => enrolment.batchId),
          ),
        ),
      )
      .orderBy(desc(lessonProgress.lastAccessed));

    const byLesson = new Map(progress.map((row) => [row.lessonId, row]));
    const lastTouchedInBatch = new Map<string, Date>();
    for (const row of progress) {
      if (!lastTouchedInBatch.has(row.batchId)) {
        lastTouchedInBatch.set(row.batchId, row.lastAccessed);
      }
    }

    const items: ContinueItem[] = [];

    for (const enrolment of enrolments) {
      const subjects = await this.curriculum.unified(enrolment.batchId, viewer);
      const lessons = subjects
        .flatMap((subject) => subject.items)
        .filter((item) => item.kind === "LESSON" && !item.locked);

      let resumed: ContinueItem | null = null;
      let firstOpen: ContinueItem | null = null;

      for (const item of lessons) {
        if (item.lessonId === null) continue;
        const held = byLesson.get(item.lessonId);
        if (held?.completed) continue;

        const candidate: ContinueItem = {
          batchId: enrolment.batchId,
          batchTitle: enrolment.title,
          batchSlug: enrolment.slug,
          lessonId: item.lessonId,
          title: item.title,
          type: item.type,
          positionSeconds: held?.lastPosition ?? 0,
          completed: false,
          lastAccessedAt: held?.lastAccessed ?? null,
          resumed: held !== undefined,
        };

        if (held !== undefined) {
          if (
            resumed === null ||
            (resumed.lastAccessedAt !== null &&
              held.lastAccessed > resumed.lastAccessedAt)
          ) {
            resumed = candidate;
          }
        } else if (firstOpen === null) {
          firstOpen = candidate;
        }
      }

      const chosen = resumed ?? firstOpen;
      if (chosen !== null) items.push(chosen);
    }

    return items.sort((left, right) => {
      const leftAt =
        left.lastAccessedAt?.getTime() ??
        lastTouchedInBatch.get(left.batchId)?.getTime() ??
        0;
      const rightAt =
        right.lastAccessedAt?.getTime() ??
        lastTouchedInBatch.get(right.batchId)?.getTime() ??
        0;
      if (leftAt !== rightAt) return rightAt - leftAt;
      return left.batchTitle.localeCompare(right.batchTitle);
    });
  }
}
