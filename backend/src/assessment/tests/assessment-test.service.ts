import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentQuestions,
  assessmentTestQuestions,
  assessmentTests,
} from "../../database/schema";
import { Transaction } from "../../database/transaction";
import {
  AddQuestionToTestDto,
  CreateAssessmentTestDto,
  ListPapersDto,
  ListTestsDto,
  UpdateAssessmentTestDto,
  UpdateTestPlacementDto,
} from "./dto/assessment-test.dto";

export interface TestView {
  testId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  maxAttempts: number;
  negativeMarkPercent: string;
  scoreFloor: string;
  passingPercent: string;
  showLeaderboard: boolean;
  showSolutions: boolean;
  examLabel: string | null;
  examYear: number | null;
  paperLabel: string | null;
  maxScore: number;
  batchId: string | null;
  opensAt: Date | null;
  closesAt: Date | null;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

export interface PlacementView {
  placementId: string;
  testId: string;
  questionId: string;
  groupId: string | null;
  order: number;
  sectionName: string | null;
  marks: string;
  negativeMarkPercent: string | null;
  effectiveNegativeMarkPercent: string;
}

type TestRow = typeof assessmentTests.$inferSelect;
type PlacementRow = typeof assessmentTestQuestions.$inferSelect;
type QuestionRow = typeof assessmentQuestions.$inferSelect;

@Injectable()
export class AssessmentTestService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createTest(
    dto: CreateAssessmentTestDto,
    actorId: string,
  ): Promise<TestView> {
    const now = this.clock.now();
    const [created] = await this.db
      .insert(assessmentTests)
      .values({
        title: dto.title,
        description: dto.description ?? null,
        durationMinutes: dto.durationMinutes ?? 30,
        maxAttempts: dto.maxAttempts ?? 1,
        negativeMarkPercent:
          dto.negativeMarkPercent !== undefined
            ? String(dto.negativeMarkPercent)
            : "0",
        scoreFloor:
          dto.scoreFloor !== undefined ? String(dto.scoreFloor) : "0",
        passingPercent:
          dto.passingPercent !== undefined ? String(dto.passingPercent) : "40",
        showLeaderboard: dto.showLeaderboard ?? true,
        showSolutions: dto.showSolutions ?? true,
        examLabel: dto.examLabel ?? null,
        examYear: dto.examYear ?? null,
        paperLabel: dto.paperLabel ?? null,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return this.presentTest(created, 0);
  }

  async getTest(testId: string): Promise<TestView> {
    const test = await this.requireTest(testId);
    const maxScore = await this.computeMaxScore(testId);
    return this.presentTest(test, maxScore);
  }

  async listTests(query: ListTestsDto): Promise<TestView[]> {
    const conditions = [eq(assessmentTests.isDeleted, false)];
    if (query.batchId) {
      conditions.push(eq(assessmentTests.batchId, query.batchId));
    }
    const rows = await this.db
      .select()
      .from(assessmentTests)
      .where(and(...conditions))
      .orderBy(desc(assessmentTests.createdAt));
    return rows.map((t) => this.presentTest(t, 0));
  }

  async updateTest(
    testId: string,
    dto: UpdateAssessmentTestDto,
  ): Promise<TestView> {
    await this.requireTest(testId);
    const now = this.clock.now();
    const updates: Partial<typeof assessmentTests.$inferInsert> = {
      updatedAt: now,
    };
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.durationMinutes !== undefined)
      updates.durationMinutes = dto.durationMinutes;
    if (dto.maxAttempts !== undefined) updates.maxAttempts = dto.maxAttempts;
    if (dto.negativeMarkPercent !== undefined)
      updates.negativeMarkPercent = String(dto.negativeMarkPercent);
    if (dto.scoreFloor !== undefined) updates.scoreFloor = String(dto.scoreFloor);
    if (dto.passingPercent !== undefined)
      updates.passingPercent = String(dto.passingPercent);
    if (dto.showLeaderboard !== undefined)
      updates.showLeaderboard = dto.showLeaderboard;
    if (dto.showSolutions !== undefined) updates.showSolutions = dto.showSolutions;
    if (dto.examLabel !== undefined) updates.examLabel = dto.examLabel;
    if (dto.examYear !== undefined) updates.examYear = dto.examYear;
    if (dto.paperLabel !== undefined) updates.paperLabel = dto.paperLabel;

    const [updated] = await this.db
      .update(assessmentTests)
      .set(updates)
      .where(
        and(
          eq(assessmentTests.testId, testId),
          eq(assessmentTests.isDeleted, false),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException("Test not found");
    const maxScore = await this.computeMaxScore(testId);
    return this.presentTest(updated, maxScore);
  }

  async deleteTest(testId: string): Promise<void> {
    await this.requireTest(testId);
    await this.db
      .update(assessmentTests)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(assessmentTests.testId, testId));
  }

  async addQuestion(
    testId: string,
    dto: AddQuestionToTestDto,
  ): Promise<PlacementView[]> {
    const test = await this.requireTest(testId);

    return this.db.transaction(async (tx) => {
      const [question] = await tx
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.questionId, dto.questionId))
        .limit(1);

      if (!question) throw new NotFoundException("Question not found");
      if (question.isRetired)
        throw new ConflictException("Cannot add a retired question to a test");
      if (question.reviewStatus === "UNREVIEWED")
        throw new ConflictException("Cannot add an unreviewed question to a test");
      if (question.reviewStatus === "REJECTED")
        throw new ConflictException("Cannot add a rejected question to a test");

      const [{ maxOrder }] = await tx
        .select({
          maxOrder: sql<number>`coalesce(max(${assessmentTestQuestions.order}), 0)`,
        })
        .from(assessmentTestQuestions)
        .where(eq(assessmentTestQuestions.testId, testId));

      if (question.groupId) {
        return this.addGroupMembers(
          tx,
          testId,
          dto,
          question,
          maxOrder,
          test.negativeMarkPercent,
        );
      }

      const [existing] = await tx
        .select({ placementId: assessmentTestQuestions.placementId })
        .from(assessmentTestQuestions)
        .where(
          and(
            eq(assessmentTestQuestions.testId, testId),
            eq(assessmentTestQuestions.questionId, dto.questionId),
          ),
        )
        .limit(1);

      if (existing)
        throw new ConflictException("This question is already in the test");

      const now = this.clock.now();
      const inserted = await tx
        .insert(assessmentTestQuestions)
        .values({
          testId,
          questionId: dto.questionId,
          groupId: null,
          order: maxOrder + 1,
          sectionName: dto.sectionName ?? null,
          marks: String(dto.marks),
          negativeMarkPercent:
            dto.negativeMarkPercent !== undefined
              ? String(dto.negativeMarkPercent)
              : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return inserted.map((p) =>
        this.presentPlacement(p, test.negativeMarkPercent),
      );
    });
  }

  async listPlacements(testId: string): Promise<PlacementView[]> {
    const test = await this.requireTest(testId);
    const rows = await this.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, testId))
      .orderBy(asc(assessmentTestQuestions.order));
    return rows.map((p) => this.presentPlacement(p, test.negativeMarkPercent));
  }

  async updatePlacement(
    testId: string,
    placementId: string,
    dto: UpdateTestPlacementDto,
  ): Promise<PlacementView> {
    const test = await this.requireTest(testId);
    await this.requirePlacement(testId, placementId);
    const now = this.clock.now();
    const updates: Partial<typeof assessmentTestQuestions.$inferInsert> = {
      updatedAt: now,
    };
    if (dto.marks !== undefined) updates.marks = String(dto.marks);
    if (dto.negativeMarkPercent !== undefined)
      updates.negativeMarkPercent = String(dto.negativeMarkPercent);
    if (dto.sectionName !== undefined) updates.sectionName = dto.sectionName;

    const [updated] = await this.db
      .update(assessmentTestQuestions)
      .set(updates)
      .where(eq(assessmentTestQuestions.placementId, placementId))
      .returning();
    if (!updated) throw new NotFoundException("Placement not found");
    return this.presentPlacement(updated, test.negativeMarkPercent);
  }

  async removePlacement(testId: string, placementId: string): Promise<void> {
    const placement = await this.requirePlacement(testId, placementId);
    await this.db.transaction(async (tx) => {
      if (placement.groupId) {
        await tx
          .delete(assessmentTestQuestions)
          .where(
            and(
              eq(assessmentTestQuestions.testId, testId),
              eq(assessmentTestQuestions.groupId, placement.groupId),
            ),
          );
      } else {
        await tx
          .delete(assessmentTestQuestions)
          .where(eq(assessmentTestQuestions.placementId, placementId));
      }
    });
  }

  async listPapers(query: ListPapersDto): Promise<TestView[]> {
    const conditions = [
      eq(assessmentTests.isDeleted, false),
      isNotNull(assessmentTests.examLabel),
    ];
    if (query.examLabel) {
      conditions.push(eq(assessmentTests.examLabel, query.examLabel));
    }
    if (query.examYear !== undefined) {
      conditions.push(eq(assessmentTests.examYear, query.examYear));
    }
    const rows = await this.db
      .select()
      .from(assessmentTests)
      .where(and(...conditions))
      .orderBy(desc(assessmentTests.examYear), asc(assessmentTests.examLabel));
    return rows.map((t) => this.presentTest(t, 0));
  }

  private async addGroupMembers(
    tx: Transaction,
    testId: string,
    dto: AddQuestionToTestDto,
    question: QuestionRow,
    maxOrder: number,
    testNegativeMarkPercent: string,
  ): Promise<PlacementView[]> {
    const groupId = question.groupId;
    if (!groupId) throw new NotFoundException("Question has no group");

    const members = await tx
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.groupId, groupId))
      .orderBy(asc(assessmentQuestions.groupOrder));

    if (members.length === 0)
      throw new NotFoundException("Question group has no members");

    const retired = members.find((m) => m.isRetired);
    if (retired)
      throw new ConflictException(
        "One or more questions in this group are retired",
      );

    const unreviewed = members.find((m) => m.reviewStatus === "UNREVIEWED");
    if (unreviewed)
      throw new ConflictException(
        "One or more questions in this group have not been reviewed",
      );

    const rejected = members.find((m) => m.reviewStatus === "REJECTED");
    if (rejected)
      throw new ConflictException(
        "One or more questions in this group were rejected",
      );

    const memberIds = members.map((m) => m.questionId);

    const conflicts = await tx
      .select({ questionId: assessmentTestQuestions.questionId })
      .from(assessmentTestQuestions)
      .where(
        and(
          eq(assessmentTestQuestions.testId, testId),
          inArray(assessmentTestQuestions.questionId, memberIds),
        ),
      );

    if (conflicts.length > 0)
      throw new ConflictException(
        "One or more questions in this group are already in the test",
      );

    const now = this.clock.now();
    const inserted = await tx
      .insert(assessmentTestQuestions)
      .values(
        members.map((member, idx) => ({
          testId,
          questionId: member.questionId,
          groupId,
          order: maxOrder + idx + 1,
          sectionName: dto.sectionName ?? null,
          marks: String(dto.marks),
          negativeMarkPercent:
            dto.negativeMarkPercent !== undefined
              ? String(dto.negativeMarkPercent)
              : null,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();

    return inserted.map((p) => this.presentPlacement(p, testNegativeMarkPercent));
  }

  private async requireTest(testId: string): Promise<TestRow> {
    const [row] = await this.db
      .select()
      .from(assessmentTests)
      .where(
        and(
          eq(assessmentTests.testId, testId),
          eq(assessmentTests.isDeleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Test not found");
    return row;
  }

  private async requirePlacement(
    testId: string,
    placementId: string,
  ): Promise<PlacementRow> {
    const [row] = await this.db
      .select()
      .from(assessmentTestQuestions)
      .where(
        and(
          eq(assessmentTestQuestions.placementId, placementId),
          eq(assessmentTestQuestions.testId, testId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Placement not found");
    return row;
  }

  private async computeMaxScore(testId: string): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${assessmentTestQuestions.marks}::numeric), 0)`,
      })
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, testId));
    return Number(row?.total ?? 0);
  }

  private presentTest(test: TestRow, maxScore: number): TestView {
    return {
      testId: test.testId,
      title: test.title,
      description: test.description ?? null,
      durationMinutes: test.durationMinutes,
      maxAttempts: test.maxAttempts,
      negativeMarkPercent: test.negativeMarkPercent,
      scoreFloor: test.scoreFloor,
      passingPercent: test.passingPercent,
      showLeaderboard: test.showLeaderboard,
      showSolutions: test.showSolutions,
      examLabel: test.examLabel ?? null,
      examYear: test.examYear ?? null,
      paperLabel: test.paperLabel ?? null,
      maxScore,
      batchId: test.batchId ?? null,
      opensAt: test.opensAt ?? null,
      closesAt: test.closesAt ?? null,
      publishedAt: test.publishedAt ?? null,
      createdBy: test.createdBy,
      createdAt: test.createdAt,
    };
  }

  private presentPlacement(
    row: PlacementRow,
    testNegativeMarkPercent: string,
  ): PlacementView {
    return {
      placementId: row.placementId,
      testId: row.testId,
      questionId: row.questionId,
      groupId: row.groupId ?? null,
      order: row.order,
      sectionName: row.sectionName ?? null,
      marks: row.marks,
      negativeMarkPercent: row.negativeMarkPercent ?? null,
      effectiveNegativeMarkPercent:
        row.negativeMarkPercent ?? testNegativeMarkPercent,
    };
  }
}
