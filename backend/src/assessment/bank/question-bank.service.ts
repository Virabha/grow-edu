import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SQL, and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  ContentBlock,
  QuestionAnswerKey,
  QuestionOption,
  assessmentQuestionVersions,
  assessmentQuestions,
} from "../../database/schema";
import { Queryable } from "../../database/transaction";
import { TaxonomyService } from "../taxonomy/taxonomy.service";
import { buildScoringShape, isHumanGraded } from "./answer-key";
import { contentToSearchText, parseContent, parseOptions } from "./content";
import {
  CreateQuestionDto,
  QuestionType,
  SearchQuestionsDto,
  UpdateQuestionDto,
  UpdateQuestionTagsDto,
} from "./dto/question.dto";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export interface QuestionView {
  questionId: string;
  type: QuestionType;
  subjectId: string;
  topicId: string;
  subTopicId: string | null;
  authoredDifficulty: number;
  observedDifficulty: number | null;
  observedAttemptCount: number;
  groupId: string | null;
  groupOrder: number | null;
  version: number;
  currentVersion: number;
  isRetired: boolean;
  isHumanGraded: boolean;
  prompt: ContentBlock[];
  options: QuestionOption[];
  answerKey: QuestionAnswerKey | null;
  explanation: ContentBlock[];
  partialCreditRule: string | null;
  toleranceKind: string | null;
  tolerance: number | null;
  createdBy: string;
}

type QuestionRow = typeof assessmentQuestions.$inferSelect;
type VersionRow = typeof assessmentQuestionVersions.$inferSelect;

@Injectable()
export class QuestionBankService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly taxonomy: TaxonomyService,
    private readonly auditLog: AuditLogService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(dto: CreateQuestionDto, actorId: string): Promise<QuestionView> {
    await this.taxonomy.assertTagsExist(dto);
    await this.taxonomy.assertDifficultyExists(dto.difficulty);

    const prompt = parseContent(dto.prompt, "prompt");
    const explanation = parseContent(dto.explanation ?? [], "explanation", {
      allowEmpty: true,
    });
    const options = parseOptions(dto.options ?? [], "options");
    const shape = buildScoringShape(
      dto.type,
      options,
      dto.answerKey,
      dto.partialCreditRule,
      dto.toleranceKind,
      dto.tolerance,
    );

    const now = this.clock.now();

    const { question, version } = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(assessmentQuestions)
        .values({
          type: dto.type,
          subjectId: dto.subjectId,
          topicId: dto.topicId,
          subTopicId: dto.subTopicId ?? null,
          authoredDifficulty: dto.difficulty,
          groupId: dto.groupId ?? null,
          groupOrder: dto.groupOrder ?? null,
          currentVersion: 1,
          createdBy: actorId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [firstVersion] = await tx
        .insert(assessmentQuestionVersions)
        .values({
          questionId: created.questionId,
          version: 1,
          prompt,
          options: shape.options,
          answerKey: shape.answerKey,
          explanation,
          partialCreditRule: shape.partialCreditRule,
          toleranceKind: shape.toleranceKind,
          tolerance: shape.tolerance,
          searchText: this.searchTextFor(prompt, shape.options),
          createdBy: actorId,
          createdAt: now,
        })
        .returning();

      return { question: created, version: firstVersion };
    });

    return this.present(question, version);
  }

  async get(questionId: string): Promise<QuestionView> {
    const question = await this.require(questionId);
    const version = await this.versionOf(questionId, question.currentVersion);
    return this.present(question, version);
  }

  async getVersion(
    questionId: string,
    version: number,
  ): Promise<QuestionView> {
    const question = await this.require(questionId);
    const row = await this.versionOf(questionId, version);
    return this.present(question, row);
  }

  async edit(
    questionId: string,
    dto: UpdateQuestionDto,
    actorId: string,
  ): Promise<QuestionView> {
    const question = await this.require(questionId);
    if (question.isRetired) {
      throw new ConflictException("A retired question cannot be edited");
    }

    const current = await this.versionOf(questionId, question.currentVersion);

    const prompt =
      dto.prompt === undefined
        ? current.prompt
        : parseContent(dto.prompt, "prompt");
    const explanation =
      dto.explanation === undefined
        ? current.explanation
        : parseContent(dto.explanation, "explanation", { allowEmpty: true });
    const options =
      dto.options === undefined
        ? current.options
        : parseOptions(dto.options, "options");

    const shape = isHumanGraded(question.type)
      ? buildScoringShape(question.type, [], undefined, undefined, undefined, undefined)
      : buildScoringShape(
          question.type,
          options,
          dto.answerKey ?? this.answerKeyAsInput(current.answerKey),
          dto.partialCreditRule ?? current.partialCreditRule ?? undefined,
          dto.toleranceKind ?? current.toleranceKind ?? undefined,
          dto.tolerance ??
            (current.tolerance === null ? undefined : Number(current.tolerance)),
        );

    const now = this.clock.now();
    const nextVersion = question.currentVersion + 1;

    const { updated, version } = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(assessmentQuestionVersions)
        .values({
          questionId,
          version: nextVersion,
          prompt,
          options: shape.options,
          answerKey: shape.answerKey,
          explanation,
          partialCreditRule: shape.partialCreditRule,
          toleranceKind: shape.toleranceKind,
          tolerance: shape.tolerance,
          searchText: this.searchTextFor(prompt, shape.options),
          createdBy: actorId,
          createdAt: now,
        })
        .returning();

      const [row] = await tx
        .update(assessmentQuestions)
        .set({ currentVersion: nextVersion, updatedAt: now })
        .where(eq(assessmentQuestions.questionId, questionId))
        .returning();

      return { updated: row, version: created };
    });

    await this.auditLog.record({
      action: "assessment.question.edit",
      targetType: "assessmentQuestion",
      targetId: questionId,
      before: { version: question.currentVersion },
      after: { version: nextVersion },
    });

    return this.present(updated, version);
  }

  async retag(
    questionId: string,
    dto: UpdateQuestionTagsDto,
  ): Promise<QuestionView> {
    const question = await this.require(questionId);

    const next = {
      subjectId: dto.subjectId ?? question.subjectId,
      topicId: dto.topicId ?? question.topicId,
      subTopicId:
        dto.subTopicId === undefined ? question.subTopicId : dto.subTopicId,
      difficulty: dto.difficulty ?? question.authoredDifficulty,
    };

    await this.taxonomy.assertTagsExist(next);
    await this.taxonomy.assertDifficultyExists(next.difficulty);

    const [updated] = await this.db
      .update(assessmentQuestions)
      .set({
        subjectId: next.subjectId,
        topicId: next.topicId,
        subTopicId: next.subTopicId,
        authoredDifficulty: next.difficulty,
        updatedAt: this.clock.now(),
      })
      .where(eq(assessmentQuestions.questionId, questionId))
      .returning();

    const version = await this.versionOf(questionId, updated.currentVersion);
    return this.present(updated, version);
  }

  async retire(questionId: string): Promise<QuestionView> {
    const question = await this.require(questionId);
    const now = this.clock.now();

    const [updated] = await this.db
      .update(assessmentQuestions)
      .set({ isRetired: true, retiredAt: now, updatedAt: now })
      .where(eq(assessmentQuestions.questionId, questionId))
      .returning();

    await this.auditLog.record({
      action: "assessment.question.retire",
      targetType: "assessmentQuestion",
      targetId: questionId,
      before: { isRetired: question.isRetired },
      after: { isRetired: true },
    });

    const version = await this.versionOf(questionId, updated.currentVersion);
    return this.present(updated, version);
  }

  async search(query: SearchQuestionsDto): Promise<{
    data: QuestionView[];
    pagination: { page: number; pageSize: number; total: number };
  }> {
    const filters: SQL[] = [];

    if (!query.includeRetired) {
      filters.push(eq(assessmentQuestions.isRetired, false));
    }
    if (query.type) filters.push(eq(assessmentQuestions.type, query.type));
    if (query.createdBy) {
      filters.push(eq(assessmentQuestions.createdBy, query.createdBy));
    }
    if (query.difficulty !== undefined) {
      filters.push(eq(assessmentQuestions.authoredDifficulty, query.difficulty));
    }
    if (query.subjectId) {
      filters.push(eq(assessmentQuestions.subjectId, query.subjectId));
    }
    if (query.subTopicId) {
      filters.push(eq(assessmentQuestions.subTopicId, query.subTopicId));
    }
    if (query.topicId) {
      const within = await this.taxonomy.descendantsOf(query.topicId);
      const under = or(
        inArray(assessmentQuestions.topicId, within),
        inArray(assessmentQuestions.subTopicId, within),
      );
      if (under) filters.push(under);
    }
    if (query.text) {
      filters.push(ilike(assessmentQuestionVersions.searchText, `%${query.text}%`));
    }

    const where = and(
      eq(
        assessmentQuestionVersions.version,
        assessmentQuestions.currentVersion,
      ),
      ...filters,
    );

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const [counted] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(assessmentQuestions)
      .innerJoin(
        assessmentQuestionVersions,
        eq(
          assessmentQuestionVersions.questionId,
          assessmentQuestions.questionId,
        ),
      )
      .where(where);

    const rows = await this.db
      .select()
      .from(assessmentQuestions)
      .innerJoin(
        assessmentQuestionVersions,
        eq(
          assessmentQuestionVersions.questionId,
          assessmentQuestions.questionId,
        ),
      )
      .where(where)
      .orderBy(
        desc(assessmentQuestions.createdAt),
        asc(assessmentQuestions.questionId),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: rows.map((row) =>
        this.present(
          row.assessment_questions,
          row.assessment_question_versions,
        ),
      ),
      pagination: { page, pageSize, total: counted?.total ?? 0 },
    };
  }

  async requireUsable(
    questionId: string,
    tx: Queryable = this.db,
  ): Promise<QuestionRow> {
    const [row] = await tx
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, questionId))
      .limit(1);

    if (!row) throw new NotFoundException("Question not found");
    if (row.isRetired) {
      throw new ConflictException("That question is retired");
    }
    return row;
  }

  private answerKeyAsInput(
    key: QuestionAnswerKey | null,
  ): Record<string, unknown> | undefined {
    if (!key) return undefined;
    if (key.kind === "SINGLE") return { optionId: key.optionId };
    if (key.kind === "MULTIPLE") return { optionIds: key.optionIds };
    return { value: key.value };
  }

  private searchTextFor(
    prompt: ContentBlock[],
    options: QuestionOption[],
  ): string {
    const optionText = options
      .map((option) => contentToSearchText(option.content))
      .join(" ");
    return `${contentToSearchText(prompt)} ${optionText}`.trim();
  }

  private async require(questionId: string): Promise<QuestionRow> {
    const [row] = await this.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, questionId))
      .limit(1);
    if (!row) throw new NotFoundException("Question not found");
    return row;
  }

  private async versionOf(
    questionId: string,
    version: number,
  ): Promise<VersionRow> {
    const [row] = await this.db
      .select()
      .from(assessmentQuestionVersions)
      .where(
        and(
          eq(assessmentQuestionVersions.questionId, questionId),
          eq(assessmentQuestionVersions.version, version),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Question version not found");
    return row;
  }

  private present(question: QuestionRow, version: VersionRow): QuestionView {
    return {
      questionId: question.questionId,
      type: question.type,
      subjectId: question.subjectId,
      topicId: question.topicId,
      subTopicId: question.subTopicId,
      authoredDifficulty: question.authoredDifficulty,
      observedDifficulty:
        question.observedDifficulty === null
          ? null
          : Number(question.observedDifficulty),
      observedAttemptCount: question.observedAttemptCount,
      groupId: question.groupId,
      groupOrder: question.groupOrder,
      version: version.version,
      currentVersion: question.currentVersion,
      isRetired: question.isRetired,
      isHumanGraded: isHumanGraded(question.type),
      prompt: version.prompt,
      options: version.options,
      answerKey: version.answerKey ?? null,
      explanation: version.explanation,
      partialCreditRule: version.partialCreditRule,
      toleranceKind: version.toleranceKind,
      tolerance: version.tolerance === null ? null : Number(version.tolerance),
      createdBy: question.createdBy,
    };
  }
}
