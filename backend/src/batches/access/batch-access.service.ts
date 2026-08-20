import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchEnrollments,
  batchInstructors,
  batchSubjects,
  batches,
  lessons,
} from "../../database/schema";
import { BATCH_ACCESS_EXPIRED, BATCH_NOT_FOUND } from "./access.errors";

export type Viewer = { userId?: string; role?: string };
export type SignedInViewer = Viewer & { userId: string };
export type AccessLevel = "READ" | "MANAGE";

export type Batch = typeof batches.$inferSelect;
export type Enrollment = typeof batchEnrollments.$inferSelect;

export type Access = {
  batch: Batch;
  isStaff: boolean;
  enrollment: Enrollment | null;
};

@Injectable()
export class BatchAccessService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async require(
    batchId: string,
    viewer: Viewer,
    level: AccessLevel,
  ): Promise<Access> {
    const batch = await this.load(batchId);
    if (!batch) throw this.absent();

    const isStaff = await this.isStaff(batchId, viewer);
    if (isStaff) return { batch, isStaff: true, enrollment: null };
    if (level === "MANAGE" || !viewer.userId) throw this.absent();

    const enrollment = await this.activeEnrollment(batchId, viewer.userId);
    if (!enrollment) throw this.absent();
    if (enrollment.accessEndsAt && enrollment.accessEndsAt < new Date()) {
      throw new ForbiddenException({
        code: BATCH_ACCESS_EXPIRED,
        message:
          "Your access to this batch has ended. Contact support to renew it.",
      });
    }

    return { batch, isStaff: false, enrollment };
  }

  async requireForSubject(
    subjectId: string,
    viewer: Viewer,
    level: AccessLevel,
  ): Promise<Access & { subjectId: string }> {
    const [subject] = await this.db
      .select({ batchId: batchSubjects.batchId })
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.subjectId, subjectId),
          eq(batchSubjects.isDeleted, false),
        ),
      )
      .limit(1);
    if (!subject) throw this.absent();
    return { ...(await this.require(subject.batchId, viewer, level)), subjectId };
  }

  async requireForLesson(
    lessonId: string,
    viewer: Viewer,
    level: AccessLevel,
  ): Promise<Access & { lesson: typeof lessons.$inferSelect }> {
    const [row] = await this.db
      .select({ lesson: lessons, batchId: batchSubjects.batchId })
      .from(lessons)
      .innerJoin(
        batchSubjects,
        eq(batchSubjects.subjectId, lessons.subjectId),
      )
      .where(and(eq(lessons.lessonId, lessonId), eq(lessons.isDeleted, false)))
      .limit(1);
    if (!row) throw this.absent();

    if (level === "READ" && row.lesson.isFreePreview) {
      const batch = await this.load(row.batchId);
      if (!batch) throw this.absent();
      return {
        batch,
        isStaff: await this.isStaff(row.batchId, viewer),
        enrollment: null,
        lesson: row.lesson,
      };
    }

    return {
      ...(await this.require(row.batchId, viewer, level)),
      lesson: row.lesson,
    };
  }

  async requireBatch(batchId: string): Promise<Batch> {
    const batch = await this.load(batchId);
    if (!batch) throw this.absent();
    return batch;
  }

  async isEnrolled(batchId: string, userId: string): Promise<boolean> {
    return (await this.activeEnrollment(batchId, userId)) !== null;
  }

  async enrolledUserIds(batchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );
    return rows.map((r) => r.userId);
  }

  async enrolledBatchIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: batchEnrollments.batchId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );
    return rows.map((r) => r.batchId);
  }

  async taughtBatchIds(instructorId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: batchInstructors.batchId })
      .from(batchInstructors)
      .where(eq(batchInstructors.instructorId, instructorId));
    return rows.map((r) => r.batchId);
  }

  async instructorsOn(batchIds: string[]) {
    if (batchIds.length === 0) return [];
    return this.db
      .select()
      .from(batchInstructors)
      .where(inArray(batchInstructors.batchId, batchIds));
  }

  private async load(batchId: string): Promise<Batch | null> {
    const [batch] = await this.db
      .select()
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    return batch ?? null;
  }

  async isStaff(batchId: string, viewer: Viewer): Promise<boolean> {
    if (viewer.role === "PLATFORM_ADMIN") return true;
    if (viewer.role !== "INSTRUCTOR" || !viewer.userId) return false;
    const [row] = await this.db
      .select({ batchId: batchInstructors.batchId })
      .from(batchInstructors)
      .where(
        and(
          eq(batchInstructors.batchId, batchId),
          eq(batchInstructors.instructorId, viewer.userId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private async activeEnrollment(
    batchId: string,
    userId: string,
  ): Promise<Enrollment | null> {
    const [row] = await this.db
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private absent(): NotFoundException {
    return new NotFoundException({
      code: BATCH_NOT_FOUND,
      message: "Batch not found",
    });
  }
}
