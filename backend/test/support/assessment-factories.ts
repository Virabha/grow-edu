import { randomUUID } from 'crypto';
import {
  ContentBlock,
  QuestionAnswerKey,
  QuestionOption,
  assessmentDifficultyLevels,
  assessmentQuestionGroups,
  assessmentQuestionVersions,
  assessmentTaxonomyNodes,
  assessmentQuestions,
  assessmentTestQuestions,
  assessmentTests,
} from '../../src/database/schema';
import { TestDatabase } from './test-database';

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${randomUUID().slice(0, 8)}`;
}

export const DEFAULT_DIFFICULTY_SCALE = [
  { ordinal: 1, label: 'Easy' },
  { ordinal: 2, label: 'Moderate' },
  { ordinal: 3, label: 'Hard' },
];

export type Taxonomy = {
  subjectId: string;
  topicId: string;
  subTopicId: string;
};

export function text(value: string): ContentBlock[] {
  return [{ type: 'TEXT', text: value }];
}

export async function seedDifficultyScale(
  database: TestDatabase,
  levels = DEFAULT_DIFFICULTY_SCALE,
): Promise<void> {
  await database.db.insert(assessmentDifficultyLevels).values(levels);
}

export async function createTaxonomy(
  database: TestDatabase,
  createdBy: string,
  names: { subject?: string; topic?: string; subTopic?: string } = {},
): Promise<Taxonomy> {
  const subjectId = randomUUID();
  const topicId = randomUUID();
  const subTopicId = randomUUID();

  await database.db.insert(assessmentTaxonomyNodes).values([
    {
      nodeId: subjectId,
      kind: 'SUBJECT',
      parentId: null,
      name: names.subject ?? unique('subject'),
      createdBy,
    },
    {
      nodeId: topicId,
      kind: 'TOPIC',
      parentId: subjectId,
      name: names.topic ?? unique('topic'),
      createdBy,
    },
    {
      nodeId: subTopicId,
      kind: 'SUB_TOPIC',
      parentId: topicId,
      name: names.subTopic ?? unique('subtopic'),
      createdBy,
    },
  ]);

  return { subjectId, topicId, subTopicId };
}

export async function createTopicUnder(
  database: TestDatabase,
  subjectId: string,
  createdBy: string,
  name?: string,
): Promise<string> {
  const topicId = randomUUID();
  await database.db.insert(assessmentTaxonomyNodes).values({
    nodeId: topicId,
    kind: 'TOPIC',
    parentId: subjectId,
    name: name ?? unique('topic'),
    createdBy,
  });
  return topicId;
}

export type QuestionSeed = {
  type?:
    | 'SINGLE_CORRECT'
    | 'MULTIPLE_CORRECT'
    | 'NUMERIC'
    | 'WRITTEN'
    | 'IMAGE_UPLOAD';
  difficulty?: number;
  subTopicId?: string | null;
  groupId?: string | null;
  groupOrder?: number | null;
  prompt?: ContentBlock[];
  options?: QuestionOption[];
  answerKey?: QuestionAnswerKey | null;
  explanation?: ContentBlock[];
  partialCreditRule?: 'ALL_OR_NOTHING' | 'PROPORTIONAL' | null;
  toleranceKind?: 'ABSOLUTE' | 'RELATIVE' | null;
  tolerance?: string | null;
  isRetired?: boolean;
};

function defaultsFor(seed: QuestionSeed): {
  options: QuestionOption[];
  answerKey: QuestionAnswerKey | null;
} {
  const type = seed.type ?? 'SINGLE_CORRECT';

  if (seed.options !== undefined || seed.answerKey !== undefined) {
    return {
      options: seed.options ?? [],
      answerKey: seed.answerKey ?? null,
    };
  }

  if (type === 'SINGLE_CORRECT' || type === 'MULTIPLE_CORRECT') {
    const options: QuestionOption[] = [
      { id: 'a', content: text('Option A') },
      { id: 'b', content: text('Option B') },
      { id: 'c', content: text('Option C') },
    ];
    return {
      options,
      answerKey:
        type === 'SINGLE_CORRECT'
          ? { kind: 'SINGLE', optionId: 'a' }
          : { kind: 'MULTIPLE', optionIds: ['a', 'b'] },
    };
  }

  if (type === 'NUMERIC') {
    return { options: [], answerKey: { kind: 'NUMERIC', value: 42 } };
  }

  return { options: [], answerKey: null };
}

export async function createQuestion(
  database: TestDatabase,
  taxonomy: Pick<Taxonomy, 'subjectId' | 'topicId'>,
  createdBy: string,
  seed: QuestionSeed = {},
): Promise<string> {
  const questionId = randomUUID();
  const type = seed.type ?? 'SINGLE_CORRECT';
  const { options, answerKey } = defaultsFor(seed);
  const prompt = seed.prompt ?? text(unique('prompt'));

  await database.db.insert(assessmentQuestions).values({
    questionId,
    type,
    subjectId: taxonomy.subjectId,
    topicId: taxonomy.topicId,
    subTopicId: seed.subTopicId ?? null,
    authoredDifficulty: seed.difficulty ?? 1,
    groupId: seed.groupId ?? null,
    groupOrder: seed.groupOrder ?? null,
    currentVersion: 1,
    isRetired: seed.isRetired ?? false,
    createdBy,
  });

  await database.db.insert(assessmentQuestionVersions).values({
    questionId,
    version: 1,
    prompt,
    options,
    answerKey,
    explanation: seed.explanation ?? text('Because.'),
    partialCreditRule:
      seed.partialCreditRule ??
      (type === 'MULTIPLE_CORRECT' ? 'ALL_OR_NOTHING' : null),
    toleranceKind:
      seed.toleranceKind ?? (type === 'NUMERIC' ? 'ABSOLUTE' : null),
    tolerance: seed.tolerance ?? (type === 'NUMERIC' ? '0' : null),
    searchText: prompt
      .map((block) => (block.type === 'TEXT' ? block.text : ''))
      .join(' ')
      .trim(),
    createdBy,
  });

  return questionId;
}

export async function createQuestionGroup(
  database: TestDatabase,
  createdBy: string,
  stimulus: ContentBlock[] = text('Read the passage below.'),
): Promise<string> {
  const groupId = randomUUID();
  await database.db.insert(assessmentQuestionGroups).values({
    groupId,
    title: unique('group'),
    stimulus,
    createdBy,
  });
  return groupId;
}

export async function createTest(
  database: TestDatabase,
  createdBy: string,
  overrides: Partial<typeof assessmentTests.$inferInsert> = {},
): Promise<string> {
  const testId = randomUUID();
  await database.db.insert(assessmentTests).values({
    testId,
    title: unique('test'),
    createdBy,
    ...overrides,
  });
  return testId;
}

export async function placeQuestion(
  database: TestDatabase,
  testId: string,
  questionId: string,
  overrides: Partial<typeof assessmentTestQuestions.$inferInsert> = {},
): Promise<string> {
  const placementId = randomUUID();
  await database.db.insert(assessmentTestQuestions).values({
    placementId,
    testId,
    questionId,
    order: 1,
    marks: '4',
    ...overrides,
  });
  return placementId;
}
