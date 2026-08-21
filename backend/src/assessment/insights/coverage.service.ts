import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentDifficultyLevels,
  assessmentQuestions,
  assessmentTaxonomyNodes,
} from "../../database/schema";

export const PRACTICE_SET_MINIMUM = 10;

export interface TopicCoverage {
  topicId: string;
  topicName: string;
  isRetired: boolean;
  total: number;
  byDifficulty: Record<string, number>;
  enoughForPractice: boolean;
}

export interface SubjectCoverage {
  subjectId: string;
  subjectName: string;
  isRetired: boolean;
  total: number;
  byDifficulty: Record<string, number>;
  topics: TopicCoverage[];
}

export interface CoverageReport {
  difficultyLevels: { ordinal: number; label: string }[];
  practiceSetMinimum: number;
  totals: { questions: number; subjects: number; topics: number };
  subjects: SubjectCoverage[];
}

@Injectable()
export class CoverageService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async report(): Promise<CoverageReport> {
    const levels = await this.db
      .select()
      .from(assessmentDifficultyLevels)
      .orderBy(asc(assessmentDifficultyLevels.ordinal));

    const nodes = await this.db
      .select()
      .from(assessmentTaxonomyNodes)
      .orderBy(asc(assessmentTaxonomyNodes.name));

    const questions = await this.db
      .select({
        topicId: assessmentQuestions.topicId,
        subTopicId: assessmentQuestions.subTopicId,
        difficulty: assessmentQuestions.authoredDifficulty,
      })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.isRetired, false));

    const parentOf = new Map<string, string | null>();
    for (const node of nodes) parentOf.set(node.nodeId, node.parentId);

    const emptyTally = (): Record<string, number> => {
      const tally: Record<string, number> = {};
      for (const level of levels) tally[String(level.ordinal)] = 0;
      return tally;
    };

    const perTopic = new Map<string, Record<string, number>>();
    for (const node of nodes) {
      if (node.kind === "TOPIC") perTopic.set(node.nodeId, emptyTally());
    }

    for (const question of questions) {
      const topicId = this.topicFor(question, parentOf);
      if (!topicId) continue;
      const tally = perTopic.get(topicId);
      if (!tally) continue;
      const key = String(question.difficulty);
      tally[key] = (tally[key] ?? 0) + 1;
    }

    const subjects = nodes.filter((node) => node.kind === "SUBJECT");
    const topics = nodes.filter((node) => node.kind === "TOPIC");

    const report: SubjectCoverage[] = subjects.map((subject) => {
      const owned = topics.filter((topic) => topic.parentId === subject.nodeId);
      const subjectTally = emptyTally();
      let subjectTotal = 0;

      const topicViews: TopicCoverage[] = owned.map((topic) => {
        const tally = perTopic.get(topic.nodeId) ?? emptyTally();
        const total = Object.values(tally).reduce((sum, n) => sum + n, 0);
        subjectTotal += total;
        for (const [key, value] of Object.entries(tally)) {
          subjectTally[key] = (subjectTally[key] ?? 0) + value;
        }
        return {
          topicId: topic.nodeId,
          topicName: topic.name,
          isRetired: topic.isRetired,
          total,
          byDifficulty: tally,
          enoughForPractice: total >= PRACTICE_SET_MINIMUM,
        };
      });

      return {
        subjectId: subject.nodeId,
        subjectName: subject.name,
        isRetired: subject.isRetired,
        total: subjectTotal,
        byDifficulty: subjectTally,
        topics: topicViews,
      };
    });

    return {
      difficultyLevels: levels.map((level) => ({
        ordinal: level.ordinal,
        label: level.label,
      })),
      practiceSetMinimum: PRACTICE_SET_MINIMUM,
      totals: {
        questions: questions.length,
        subjects: subjects.length,
        topics: topics.length,
      },
      subjects: report,
    };
  }

  private topicFor(
    question: { topicId: string; subTopicId: string | null },
    parentOf: Map<string, string | null>,
  ): string | null {
    if (parentOf.has(question.topicId)) return question.topicId;
    if (question.subTopicId) {
      const parent = parentOf.get(question.subTopicId);
      if (parent) return parent;
    }
    return null;
  }
}
