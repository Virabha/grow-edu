import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../../common/clock';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import {
  ContentBlock,
  QuestionAnswerKey,
  QuestionOption,
  assessmentDifficultyLevels,
  assessmentImportRows,
  assessmentImports,
  assessmentQuestionVersions,
  assessmentQuestions,
  assessmentTaxonomyNodes,
} from '../../database/schema';
import { JOB_QUEUE, JobQueue } from '../../jobs/job-queue';
import { isRecord } from '../shared/type-guards';
import { buildScoringShape } from '../bank/answer-key';
import { contentToSearchText, parseContent, parseOptions } from '../bank/content';
import {
  QUESTION_TYPES,
  QuestionType,
  PartialCreditRule,
  ToleranceKind,
} from '../bank/dto/question.dto';

const COMMIT_JOB = 'assessment.import.commit';

interface CommitPayload {
  importId: string;
  actorId: string;
}


function asQuestionType(value: unknown): QuestionType | null {
  if (typeof value !== 'string') return null;
  return (QUESTION_TYPES as readonly string[]).includes(value)
    ? (value as QuestionType)
    : null;
}

@Injectable()
export class QuestionImportService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    this.jobs.register<CommitPayload>(COMMIT_JOB, (payload) =>
      this.runCommit(payload),
    );
  }

  async preview(rawRows: unknown[], actorId: string) {
    const nodes = await this.db
      .select()
      .from(assessmentTaxonomyNodes)
      .where(eq(assessmentTaxonomyNodes.isRetired, false));

    const subjects = new Map<string, string>();
    const topicsByName = new Map<
      string,
      Array<{ nodeId: string; parentId: string | null }>
    >();
    const subTopicsByName = new Map<
      string,
      Array<{ nodeId: string; parentId: string | null }>
    >();

    for (const node of nodes) {
      if (node.kind === 'SUBJECT') {
        subjects.set(node.name, node.nodeId);
      } else if (node.kind === 'TOPIC') {
        const arr = topicsByName.get(node.name) ?? [];
        arr.push({ nodeId: node.nodeId, parentId: node.parentId });
        topicsByName.set(node.name, arr);
      } else if (node.kind === 'SUB_TOPIC') {
        const arr = subTopicsByName.get(node.name) ?? [];
        arr.push({ nodeId: node.nodeId, parentId: node.parentId });
        subTopicsByName.set(node.name, arr);
      }
    }

    const diffLevels = await this.db
      .select({ ordinal: assessmentDifficultyLevels.ordinal })
      .from(assessmentDifficultyLevels);
    const validDifficulties = new Set(diffLevels.map((d) => d.ordinal));

    const rowResults: Array<{
      rowNumber: number;
      raw: Record<string, unknown>;
      isValid: boolean;
      errors: string[];
      parsed: Record<string, unknown> | null;
    }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 1;
      const rawRow = rawRows[i];
      const errors: string[] = [];
      let parsed: Record<string, unknown> | null = null;

      if (!isRecord(rawRow)) {
        rowResults.push({
          rowNumber,
          raw: {},
          isValid: false,
          errors: ['row must be an object'],
          parsed: null,
        });
        continue;
      }

      const raw = rawRow;

      const type = asQuestionType(raw['type']);
      if (type === null) {
        errors.push(`type must be one of ${QUESTION_TYPES.join(', ')}`);
      }

      const subjectName = raw['subject'];
      let subjectId: string | undefined;
      if (typeof subjectName !== 'string' || subjectName.length === 0) {
        errors.push('subject is required');
      } else {
        subjectId = subjects.get(subjectName);
        if (!subjectId) {
          errors.push(`subject "${subjectName}" not found`);
        }
      }

      const topicName = raw['topic'];
      let topicId: string | undefined;
      if (typeof topicName !== 'string' || topicName.length === 0) {
        errors.push('topic is required');
      } else if (subjectId) {
        const matchingTopics = topicsByName.get(topicName) ?? [];
        const topic = matchingTopics.find((t) => t.parentId === subjectId);
        if (!topic) {
          errors.push(
            `topic "${topicName}" not found under subject "${String(subjectName)}"`,
          );
        } else {
          topicId = topic.nodeId;
        }
      } else if (typeof topicName === 'string' && topicName.length > 0 && !subjectId) {
        errors.push(`topic "${topicName}" cannot be resolved without a valid subject`);
      }

      const subTopicName = raw['subTopic'];
      let subTopicId: string | null = null;
      if (typeof subTopicName === 'string' && subTopicName.length > 0) {
        if (topicId) {
          const matchingSubTopics = subTopicsByName.get(subTopicName) ?? [];
          const subTopic = matchingSubTopics.find(
            (st) => st.parentId === topicId,
          );
          if (!subTopic) {
            errors.push(
              `subTopic "${subTopicName}" not found under topic "${String(topicName)}"`,
            );
          } else {
            subTopicId = subTopic.nodeId;
          }
        }
      }

      const diffVal = raw['difficulty'];
      let difficulty = 0;
      if (
        typeof diffVal !== 'number' ||
        !Number.isInteger(diffVal) ||
        diffVal < 1
      ) {
        errors.push('difficulty must be a positive integer');
      } else if (!validDifficulties.has(diffVal)) {
        errors.push(`difficulty ${diffVal} is not on the configured scale`);
      } else {
        difficulty = diffVal;
      }

      try {
        const prompt = parseContent(raw['prompt'], `row[${rowNumber}].prompt`);
        const rawOptions = raw['options'];
        const options = parseOptions(
          Array.isArray(rawOptions) ? rawOptions : [],
          `row[${rowNumber}].options`,
        );
        const shape = buildScoringShape(
          type ?? 'SINGLE_CORRECT',
          options,
          isRecord(raw['correctAnswer']) ? raw['correctAnswer'] : undefined,
          undefined,
          undefined,
          undefined,
        );
        const rawExplanation = raw['explanation'];
        const explanation = parseContent(
          Array.isArray(rawExplanation) ? rawExplanation : [],
          `row[${rowNumber}].explanation`,
          { allowEmpty: true },
        );

        if (errors.length === 0 && type !== null && subjectId && topicId) {
          parsed = {
            type,
            subjectId,
            topicId,
            subTopicId,
            difficulty,
            prompt,
            options: shape.options,
            answerKey: shape.answerKey,
            explanation,
            partialCreditRule: shape.partialCreditRule,
            toleranceKind: shape.toleranceKind,
            tolerance: shape.tolerance,
          };
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }

      rowResults.push({
        rowNumber,
        raw,
        isValid: errors.length === 0,
        errors,
        parsed,
      });
    }

    const validCount = rowResults.filter((r) => r.isValid).length;
    const invalidCount = rowResults.length - validCount;

    const now = this.clock.now();

    const [importRecord] = await this.db
      .insert(assessmentImports)
      .values({
        status: 'PARSED',
        rowCount: rawRows.length,
        validCount,
        invalidCount,
        processedCount: 0,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (rowResults.length > 0) {
      await this.db.insert(assessmentImportRows).values(
        rowResults.map((r) => ({
          importId: importRecord.importId,
          rowNumber: r.rowNumber,
          raw: r.raw,
          parsed: r.parsed,
          isValid: r.isValid,
          errors: r.errors,
          createdAt: now,
        })),
      );
    }

    return this.presentImport(
      importRecord,
      rowResults.map((r) => ({
        rowNumber: r.rowNumber,
        isValid: r.isValid,
        errors: r.errors,
        parsed: r.parsed,
        questionId: null,
      })),
    );
  }

  async getImport(importId: string) {
    const [importRecord] = await this.db
      .select()
      .from(assessmentImports)
      .where(eq(assessmentImports.importId, importId))
      .limit(1);

    if (!importRecord) {
      throw new NotFoundException('Import not found');
    }

    const rows = await this.db
      .select()
      .from(assessmentImportRows)
      .where(eq(assessmentImportRows.importId, importId))
      .orderBy(assessmentImportRows.rowNumber);

    return this.presentImport(
      importRecord,
      rows.map((row) => ({
        rowNumber: row.rowNumber,
        isValid: row.isValid,
        errors: row.errors,
        parsed: row.parsed ?? null,
        questionId: row.questionId ?? null,
      })),
    );
  }

  async commit(importId: string, actorId: string) {
    const [importRecord] = await this.db
      .select()
      .from(assessmentImports)
      .where(eq(assessmentImports.importId, importId))
      .limit(1);

    if (!importRecord) {
      throw new NotFoundException('Import not found');
    }

    if (
      importRecord.status === 'COMMITTING' ||
      importRecord.status === 'COMMITTED'
    ) {
      throw new ConflictException(
        importRecord.status === 'COMMITTED'
          ? 'This import has already been committed'
          : 'This import is already being committed',
      );
    }

    if (importRecord.invalidCount > 0) {
      throw new ConflictException(
        `This import has ${importRecord.invalidCount} invalid row(s) and cannot be committed`,
      );
    }

    const now = this.clock.now();
    await this.db
      .update(assessmentImports)
      .set({ status: 'COMMITTING', updatedAt: now })
      .where(eq(assessmentImports.importId, importId));

    await this.jobs.enqueue<CommitPayload>(COMMIT_JOB, { importId, actorId });

    return { importId, status: 'COMMITTING' };
  }

  private async runCommit(payload: CommitPayload): Promise<void> {
    const { importId, actorId } = payload;

    const rows = await this.db
      .select()
      .from(assessmentImportRows)
      .where(
        and(
          eq(assessmentImportRows.importId, importId),
          eq(assessmentImportRows.isValid, true),
        ),
      )
      .orderBy(assessmentImportRows.rowNumber);

    const now = this.clock.now();

    try {
      const createdPairs = await this.db.transaction(async (tx) => {
        const pairs: Array<{ rowId: string; questionId: string }> = [];

        for (const row of rows) {
          if (row.parsed === null) continue;

          const d = row.parsed;
          const type = d['type'] as QuestionType;
          const subjectId = d['subjectId'] as string;
          const topicId = d['topicId'] as string;
          const subTopicId = d['subTopicId'] as string | null;
          const difficulty = d['difficulty'] as number;
          const prompt = d['prompt'] as ContentBlock[];
          const options = d['options'] as QuestionOption[];
          const answerKey = d['answerKey'] as QuestionAnswerKey | null;
          const explanation = d['explanation'] as ContentBlock[];
          const partialCreditRule = d['partialCreditRule'] as PartialCreditRule | null;
          const toleranceKind = d['toleranceKind'] as ToleranceKind | null;
          const tolerance = d['tolerance'] as string | null;

          const [question] = await tx
            .insert(assessmentQuestions)
            .values({
              type,
              subjectId,
              topicId,
              subTopicId,
              authoredDifficulty: difficulty,
              groupId: null,
              groupOrder: null,
              currentVersion: 1,
              createdBy: actorId,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          await tx.insert(assessmentQuestionVersions).values({
            questionId: question.questionId,
            version: 1,
            prompt,
            options,
            answerKey,
            explanation,
            partialCreditRule,
            toleranceKind,
            tolerance,
            searchText: this.searchTextFor(prompt, options),
            createdBy: actorId,
            createdAt: now,
          });

          pairs.push({ rowId: row.rowId, questionId: question.questionId });
        }

        return pairs;
      });

      for (const { rowId, questionId } of createdPairs) {
        await this.db
          .update(assessmentImportRows)
          .set({ questionId })
          .where(eq(assessmentImportRows.rowId, rowId));
      }

      await this.db
        .update(assessmentImports)
        .set({
          status: 'COMMITTED',
          processedCount: rows.length,
          committedAt: now,
          updatedAt: now,
        })
        .where(eq(assessmentImports.importId, importId));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await this.db
        .update(assessmentImports)
        .set({
          status: 'FAILED',
          failureReason: reason,
          updatedAt: now,
        })
        .where(eq(assessmentImports.importId, importId));
    }
  }

  private searchTextFor(
    prompt: ContentBlock[],
    options: QuestionOption[],
  ): string {
    const optionText = options
      .map((o) => contentToSearchText(o.content))
      .join(' ');
    return `${contentToSearchText(prompt)} ${optionText}`.trim();
  }

  private presentImport(
    importRecord: typeof assessmentImports.$inferSelect,
    rows: Array<{
      rowNumber: number;
      isValid: boolean;
      errors: string[];
      parsed: Record<string, unknown> | null;
      questionId: string | null;
    }>,
  ) {
    return {
      importId: importRecord.importId,
      status: importRecord.status,
      rowCount: importRecord.rowCount,
      validCount: importRecord.validCount,
      invalidCount: importRecord.invalidCount,
      processedCount: importRecord.processedCount,
      failureReason: importRecord.failureReason ?? null,
      committedAt: importRecord.committedAt?.toISOString() ?? null,
      rows: rows.map((row) => ({
        rowNumber: row.rowNumber,
        isValid: row.isValid,
        errors: row.errors,
        parsed: row.parsed,
        questionId: row.questionId,
      })),
    };
  }
}
