import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuizAttemptsService } from './quiz-attempts.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import type { LessonQuizAnswerSnapshot } from '../database/schema';

interface MockChain {
  from: () => MockChain;
  innerJoin: () => MockChain;
  where: () => MockChain;
  groupBy: () => MockChain;
  orderBy: () => MockChain;
  limit: () => MockChain;
  offset: () => Promise<unknown[]>;
  then: (
    onFulfilled: (v: unknown[]) => unknown,
    onRejected: (e: unknown) => unknown,
  ) => Promise<unknown>;
}

function makeChain(rows: unknown[]): MockChain {
  const resolved = Promise.resolve(rows);
  const chain: MockChain = {
    from:      () => chain,
    innerJoin: () => chain,
    where:     () => chain,
    groupBy:   () => chain,
    orderBy:   () => chain,
    limit:     () => chain,
    offset:    () => resolved,
    then:      (onFulfilled, onRejected) => resolved.then(onFulfilled, onRejected),
  };
  return chain;
}

function makeSnapshot(overrides: Partial<LessonQuizAnswerSnapshot> = {}): LessonQuizAnswerSnapshot {
  return {
    questionId:   'q-1',
    question:     'What is 2 + 2?',
    options:      ['3', '4', '5'],
    correctIndex: 1,
    chosenIndex:  1,
    explanation:  'Basic arithmetic.',
    ...overrides,
  };
}

function makeAttemptRow(overrides: Record<string, unknown> = {}) {
  return {
    attemptId:      'att-1',
    userId:         'user-1',
    lessonId:       'lesson-1',
    courseId:       'course-1',
    attemptNo:      1,
    totalQuestions: 3,
    correctCount:   2,
    scorePercent:   '66.00',
    passMark:       60,
    passed:         true,
    durationSeconds:180,
    startedAt:      new Date('2024-06-01T10:00:00Z'),
    submittedAt:    new Date('2024-06-01T10:03:00Z'),
    lessonTitle:    'Chapter 1 Quiz',
    courseTitle:    'Introduction to Programming',
    answers:        [makeSnapshot()],
    ...overrides,
  };
}

async function buildService(responseSequence: unknown[][]): Promise<QuizAttemptsService> {
  let call = 0;
  const mockDb = {
    select: jest.fn().mockImplementation(() => makeChain(responseSequence[call++] ?? [])),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
      }),
    }),
    query: {
      lessons: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    },
  };
  const module = await Test.createTestingModule({
    providers: [
      QuizAttemptsService,
      { provide: DATABASE_CONNECTION, useValue: mockDb },
    ],
  }).compile();
  return module.get(QuizAttemptsService);
}

async function buildServiceWithDb(
  selectSequence: unknown[][],
  lessonResult: unknown,
  insertResult: unknown[],
): Promise<QuizAttemptsService> {
  let call = 0;
  const mockDb = {
    select: jest.fn().mockImplementation(() => makeChain(selectSequence[call++] ?? [])),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(insertResult),
      }),
    }),
    query: {
      lessons: {
        findFirst: jest.fn().mockResolvedValue(lessonResult),
      },
    },
  };
  const module = await Test.createTestingModule({
    providers: [
      QuizAttemptsService,
      { provide: DATABASE_CONNECTION, useValue: mockDb },
    ],
  }).compile();
  return module.get(QuizAttemptsService);
}

describe('QuizAttemptsService.findOne — security', () => {
  it('throws NotFoundException for another user\'s attempt', async () => {
    const svc = await buildService([[makeAttemptRow({ userId: 'other-user' })]]);
    await expect(svc.findOne('user-1', 'att-1')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when no row is returned', async () => {
    const svc = await buildService([[]]);
    await expect(svc.findOne('user-1', 'att-1')).rejects.toThrow(NotFoundException);
  });

  it('does NOT reveal correctIndex for an IN_PROGRESS attempt (submittedAt null)', async () => {
    const svc = await buildService([
      [makeAttemptRow({ submittedAt: null })],
    ]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.answers.every((a) => a.correctIndex === -1)).toBe(true);
  });

  it('does NOT reveal explanation for an IN_PROGRESS attempt', async () => {
    const svc = await buildService([
      [makeAttemptRow({ submittedAt: null })],
    ]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.answers.every((a) => a.explanation === '')).toBe(true);
  });

  it('still exposes chosenIndex for an IN_PROGRESS attempt (student sees their own answer)', async () => {
    const snap = makeSnapshot({ chosenIndex: 0 });
    const svc = await buildService([
      [makeAttemptRow({ submittedAt: null, answers: [snap] })],
    ]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.answers[0].chosenIndex).toBe(0);
  });

  it('reveals correctIndex and explanation for a SUBMITTED attempt', async () => {
    const svc = await buildService([[makeAttemptRow()]]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.answers[0].correctIndex).toBe(1);
    expect(result.answers[0].explanation).toBe('Basic arithmetic.');
  });
});

describe('QuizAttemptsService.findOne — resolved titles', () => {
  it('returns lessonTitle from the join, never an empty string', async () => {
    const svc = await buildService([[makeAttemptRow({ lessonTitle: 'Algebra Fundamentals Quiz' })]]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.lessonTitle).toBe('Algebra Fundamentals Quiz');
    expect(result.quizTitle).toBe('Algebra Fundamentals Quiz');
  });

  it('returns courseTitle from the join, never an empty string', async () => {
    const svc = await buildService([[makeAttemptRow({ courseTitle: 'Maths for Beginners' })]]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.courseTitle).toBe('Maths for Beginners');
  });

  it('sets quizId to the lessonId', async () => {
    const svc = await buildService([[makeAttemptRow({ lessonId: 'lesson-42' })]]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.quizId).toBe('lesson-42');
  });
});

describe('QuizAttemptsService.findOne — score fields', () => {
  it('converts decimal scorePercent string to number', async () => {
    const svc = await buildService([[makeAttemptRow({ scorePercent: '75.00' })]]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.scorePercent).toBe(75);
  });

  it('passed is false when stored as false', async () => {
    const svc = await buildService([[makeAttemptRow({ passed: false, scorePercent: '40.00' })]]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.passed).toBe(false);
  });

  it('uses stored durationSeconds directly', async () => {
    const svc = await buildService([[makeAttemptRow({ durationSeconds: 900 })]]);
    const result = await svc.findOne('user-1', 'att-1');
    expect(result.durationSeconds).toBe(900);
  });
});

describe('QuizAttemptsService.list', () => {
  it('returns paginated data with empty answers array', async () => {
    const svc = await buildService([
      [makeAttemptRow()],
      [{ count: 1 }],
    ]);
    const result = await svc.list('user-1', { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].answers).toEqual([]);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('totalPages is at least 1 when there are no results', async () => {
    const svc = await buildService([[], [{ count: 0 }]]);
    const result = await svc.list('user-1', {});
    expect(result.pagination.totalPages).toBe(1);
  });

  it('converts scorePercent to number in list rows', async () => {
    const svc = await buildService([
      [makeAttemptRow({ scorePercent: '88.00' })],
      [{ count: 1 }],
    ]);
    const result = await svc.list('user-1', {});
    expect(result.data[0].scorePercent).toBe(88);
  });
});

describe('QuizAttemptsService.getSummary', () => {
  it('returns zeroes when there are no submitted attempts', async () => {
    const svc = await buildService([
      [{ totalAttempted: 0, passed: 0, averageScoreRaw: null }],
    ]);
    const result = await svc.getSummary('user-1');
    expect(result.totalAttempted).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.averageScore).toBe(0);
  });

  it('rounds averageScore to nearest integer', async () => {
    const svc = await buildService([
      [{ totalAttempted: 3, passed: 2, averageScoreRaw: '67.333' }],
    ]);
    const result = await svc.getSummary('user-1');
    expect(result.averageScore).toBe(67);
  });
});

describe('QuizAttemptsService.submit — guards', () => {
  it('throws BadRequestException when max attempts are exhausted', async () => {
    const lessonWithLimit = {
      lessonId:     'lesson-1',
      type:         'QUIZ',
      title:        'Test Quiz',
      sectionId:    'sec-1',
      quizVersion:  1,
      quizSettings: { attemptsAllowed: 2, passingPercentage: 60 },
      section:      { courseId: 'course-1' },
      questions:    [],
    };
    const svc = await buildServiceWithDb(
      [
        [{ id: 'enr-1' }],
        [{ count: 2 }],
      ],
      lessonWithLimit,
      [],
    );
    await expect(
      svc.submit('user-1', { lessonId: 'lesson-1', answers: [] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when lesson does not exist', async () => {
    const svc = await buildServiceWithDb([], null, []);
    await expect(
      svc.submit('user-1', { lessonId: 'no-such-lesson', answers: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when lesson type is not QUIZ', async () => {
    const videoLesson = {
      lessonId:  'lesson-vid',
      type:      'VIDEO',
      title:     'Intro Video',
      sectionId: 'sec-1',
      quizVersion: 1,
      quizSettings: null,
      section:   { courseId: 'course-1' },
      questions: [],
    };
    const svc = await buildServiceWithDb([], videoLesson, []);
    await expect(
      svc.submit('user-1', { lessonId: 'lesson-vid', answers: [] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException when user has no enrollment or section access', async () => {
    const quizLesson = {
      lessonId:     'lesson-1',
      type:         'QUIZ',
      title:        'Test Quiz',
      sectionId:    'sec-1',
      quizVersion:  1,
      quizSettings: { passingPercentage: 60 },
      section:      { courseId: 'course-1' },
      questions:    [],
    };
    const svc = await buildServiceWithDb(
      [[], []],
      quizLesson,
      [],
    );
    await expect(
      svc.submit('user-1', { lessonId: 'lesson-1', answers: [] }),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('QuizAttemptsService.submit — grading', () => {
  function makeSubmittedLesson(questions: unknown[]) {
    return {
      lessonId:     'lesson-1',
      type:         'QUIZ',
      title:        'Grading Test Quiz',
      sectionId:    'sec-1',
      quizVersion:  1,
      quizSettings: { passingPercentage: 50 },
      section:      { courseId: 'course-1' },
      questions,
    };
  }

  function makeInsertedRow(overrides: Record<string, unknown> = {}) {
    return {
      attemptId:      'att-new',
      userId:         'user-1',
      lessonId:       'lesson-1',
      courseId:       'course-1',
      attemptNo:      1,
      totalQuestions: 2,
      correctCount:   1,
      scorePercent:   '50.00',
      passMark:       50,
      passed:         true,
      durationSeconds:120,
      startedAt:      new Date('2024-06-01T10:00:00Z'),
      submittedAt:    new Date('2024-06-01T10:02:00Z'),
      answers:        [],
      ...overrides,
    };
  }

  it('grades correct answers and stores the attempt', async () => {
    const questions = [
      {
        quizQuestionId: 'q-1',
        question:       'Capital of France?',
        order:          0,
        answers:        [
          { text: 'Berlin', isCorrect: false },
          { text: 'Paris', isCorrect: true },
        ],
        explanation: 'Paris is the capital.',
      },
      {
        quizQuestionId: 'q-2',
        question:       'What is 3 * 3?',
        order:          1,
        answers:        [
          { text: '6', isCorrect: false },
          { text: '9', isCorrect: true },
        ],
        explanation: 'Multiplication.',
      },
    ];

    const inserted = makeInsertedRow({
      correctCount:  1,
      scorePercent:  '50.00',
      passed:        true,
      answers: [
        makeSnapshot({ questionId: 'q-1', correctIndex: 1, chosenIndex: 1, explanation: 'Paris is the capital.' }),
        makeSnapshot({ questionId: 'q-2', correctIndex: 1, chosenIndex: 0, explanation: 'Multiplication.' }),
      ],
    });

    const svc = await buildServiceWithDb(
      [
        [{ id: 'enr-1' }],
        [{ count: 0 }],
        [{ courseTitle: 'Test Course' }],
      ],
      makeSubmittedLesson(questions),
      [inserted],
    );

    const result = await svc.submit('user-1', {
      lessonId: 'lesson-1',
      startedAt: new Date('2024-06-01T10:00:00Z').toISOString(),
      answers: [
        { questionId: 'q-1', chosenIndex: 1 },
        { questionId: 'q-2', chosenIndex: 0 },
      ],
    });

    expect(result.attemptId).toBe('att-new');
    expect(result.quizTitle).toBe('Grading Test Quiz');
    expect(result.courseTitle).toBe('Test Course');
  });

  it('skipped answer (chosenIndex null) is not counted as correct', async () => {
    const questions = [
      {
        quizQuestionId: 'q-1',
        question:       'Choose correctly',
        order:          0,
        answers:        [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }],
        explanation:    'A is correct.',
      },
    ];

    const inserted = makeInsertedRow({
      totalQuestions: 1,
      correctCount:   0,
      scorePercent:   '0.00',
      passed:         false,
      answers: [makeSnapshot({ correctIndex: 0, chosenIndex: null })],
    });

    const svc = await buildServiceWithDb(
      [
        [{ id: 'enr-1' }],
        [{ count: 0 }],
        [{ courseTitle: 'Test Course' }],
      ],
      makeSubmittedLesson(questions),
      [inserted],
    );

    const result = await svc.submit('user-1', {
      lessonId: 'lesson-1',
      answers:  [{ questionId: 'q-1', chosenIndex: null }],
    });

    expect(result.passed).toBe(false);
    expect(result.answers[0].chosenIndex).toBeNull();
  });
});
