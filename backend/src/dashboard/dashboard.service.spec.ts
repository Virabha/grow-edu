import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { FilesService } from '../files/files.service';

// FilesService imports uuid@13 (ESM-only). Jest's CommonJS transform cannot
// parse ESM node_modules, so mock the module to prevent Jest loading the real file.
// The actual DI provider is overridden with useValue below anyway.
jest.mock('../files/files.service', () => ({
  FilesService: class FilesService {
    getDownloadUrl = jest.fn().mockReturnValue('http://cdn/img.jpg');
  },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns a date whose UTC day is `offsetDays` before `base`. */
function utcDaysBefore(base: Date, offsetDays: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── DashboardService.buildActivityArray ──────────────────────────────────────

describe('DashboardService.buildActivityArray', () => {
  const NOW = new Date('2024-06-15T12:00:00Z');

  it('returns exactly 7 entries', () => {
    const result = DashboardService.buildActivityArray(new Map(), NOW);
    expect(result).toHaveLength(7);
  });

  it('entries span the last 7 days in ascending order (oldest first)', () => {
    const result = DashboardService.buildActivityArray(new Map(), NOW);
    expect(result[0].day).toBe('2024-06-09');
    expect(result[6].day).toBe('2024-06-15');
  });

  it('fills 0 minutes for days with no data', () => {
    const result = DashboardService.buildActivityArray(new Map(), NOW);
    expect(result.every((e) => e.minutes === 0)).toBe(true);
  });

  it('converts seconds to minutes (floor division)', () => {
    const map = new Map([['2024-06-15', 3661]]); // 3661 seconds = 61 minutes + 1 sec
    const result = DashboardService.buildActivityArray(map, NOW);
    const today = result.find((e) => e.day === '2024-06-15');
    expect(today?.minutes).toBe(61); // Math.floor(3661 / 60)
  });

  it('ignores days outside the 7-day window', () => {
    const map = new Map([
      ['2024-06-08', 3600], // 8 days ago — outside window
      ['2024-06-15', 1800], // today — inside window
    ]);
    const result = DashboardService.buildActivityArray(map, NOW);
    const outside = result.find((e) => e.day === '2024-06-08');
    expect(outside).toBeUndefined();
    const today = result.find((e) => e.day === '2024-06-15');
    expect(today?.minutes).toBe(30);
  });

  it('partial days with data get correct minutes, zeros elsewhere', () => {
    const map = new Map([
      ['2024-06-13', 120], // 2 min
      ['2024-06-15', 600], // 10 min
    ]);
    const result = DashboardService.buildActivityArray(map, NOW);
    expect(result.find((e) => e.day === '2024-06-13')?.minutes).toBe(2);
    expect(result.find((e) => e.day === '2024-06-14')?.minutes).toBe(0);
    expect(result.find((e) => e.day === '2024-06-15')?.minutes).toBe(10);
  });

  it('handles 59 seconds as 0 minutes (floor)', () => {
    const map = new Map([['2024-06-15', 59]]);
    const result = DashboardService.buildActivityArray(map, NOW);
    expect(result.find((e) => e.day === '2024-06-15')?.minutes).toBe(0);
  });
});

// ─── DashboardService.computeStreak ───────────────────────────────────────────

describe('DashboardService.computeStreak', () => {
  const NOW = new Date('2024-06-15T12:00:00Z');
  const TODAY = '2024-06-15';

  it('returns 0 for an empty days array', () => {
    expect(DashboardService.computeStreak([], NOW)).toBe(0);
  });

  it('returns 1 when only today has data', () => {
    expect(DashboardService.computeStreak([TODAY], NOW)).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    const days = [
      TODAY,
      toYMD(utcDaysBefore(NOW, 1)),
      toYMD(utcDaysBefore(NOW, 2)),
    ];
    expect(DashboardService.computeStreak(days, NOW)).toBe(3);
  });

  it('breaks at a missing day', () => {
    const days = [
      TODAY,
      // day -1 missing (gap)
      toYMD(utcDaysBefore(NOW, 2)),
      toYMD(utcDaysBefore(NOW, 3)),
    ];
    // Streak is 1 (only today is consecutive from today)
    expect(DashboardService.computeStreak(days, NOW)).toBe(1);
  });

  it('starts from yesterday when today has no data', () => {
    const days = [
      toYMD(utcDaysBefore(NOW, 1)), // yesterday
      toYMD(utcDaysBefore(NOW, 2)), // 2 days ago
    ];
    expect(DashboardService.computeStreak(days, NOW)).toBe(2);
  });

  it('returns 0 when the most recent activity was 2+ days ago', () => {
    const days = [
      toYMD(utcDaysBefore(NOW, 2)),
      toYMD(utcDaysBefore(NOW, 3)),
    ];
    // Neither today nor yesterday has data → no current streak
    expect(DashboardService.computeStreak(days, NOW)).toBe(0);
  });

  it('handles a long streak correctly', () => {
    const days: string[] = [];
    for (let i = 0; i < 30; i++) {
      days.push(toYMD(utcDaysBefore(NOW, i)));
    }
    expect(DashboardService.computeStreak(days, NOW)).toBe(30);
  });

  it('is not sensitive to order of input days', () => {
    const days = [
      toYMD(utcDaysBefore(NOW, 2)),
      TODAY,
      toYMD(utcDaysBefore(NOW, 1)),
    ];
    expect(DashboardService.computeStreak(days, NOW)).toBe(3);
  });
});

// ─── DashboardService.getSummary (mocked DB) ──────────────────────────────────

/**
 * Builds a mock Drizzle-style fluent query builder that resolves to `rows`.
 * Drizzle builders are thenables (Promise-like) when awaited without .limit(),
 * and return a real Promise from .limit().
 */
function makeChain(rows: unknown[]): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  for (const method of [
    'from',
    'innerJoin',
    'leftJoin',
    'where',
    'groupBy',
    'orderBy',
  ]) {
    chain[method] = () => chain;
  }
  // Terminal via .limit() (used by Q6, Q7, Q8)
  chain['limit'] = () => Promise.resolve(rows);
  // Terminal via await (used by Q1-Q5 aggregates)
  chain['then'] = (
    resolve: (v: unknown[]) => unknown,
    reject: (e: unknown) => unknown,
  ) => Promise.resolve(rows).then(resolve, reject);
  return chain;
}

describe('DashboardService.getSummary — empty DB (no user data)', () => {
  let service: DashboardService;

  // The 9 queries fire in 2 Promise.all batches. Within each batch, jest.fn()
  // calls are ordered by position in the Promise.all array.
  const EMPTY_AGGREGATE = [{ enrolledCount: 0, activeCount: 0, completedCount: 0 }];
  const responses: unknown[][] = [
    EMPTY_AGGREGATE,                                // Q1 enrollment counts
    [{ lessonsCompleted: 0 }],                      // Q2 lessons completed
    [{ quizzesAttempted: 0, avgScoreRaw: null }],   // Q3 quiz stats
    [{ certificatesEarned: 0 }],                    // Q4a certs
    [{ totalSpendRaw: null, currency: null }],       // Q4b spend
    [],                                             // Q5 activity (30 days)
    [],                                             // Q6 continueLearning
    [],                                             // Q7 recentAttempts
    [],                                             // Q8 recentOrders
  ];

  beforeEach(async () => {
    let call = 0;
    const mockDb = {
      select: jest.fn().mockImplementation(() => makeChain(responses[call++] ?? [])),
    };
    const mockFilesService = {
      getDownloadUrl: jest.fn().mockReturnValue('http://cdn.example.com/img.jpg'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
        { provide: FilesService, useValue: mockFilesService },
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  it('does not throw for a user with no data', async () => {
    await expect(service.getSummary('user-new')).resolves.toBeDefined();
  });

  it('returns zero stats', async () => {
    const result = await service.getSummary('user-new');
    expect(result.stats.enrolledCount).toBe(0);
    expect(result.stats.activeCount).toBe(0);
    expect(result.stats.completedCount).toBe(0);
    expect(result.stats.lessonsCompleted).toBe(0);
    expect(result.stats.quizzesAttempted).toBe(0);
    expect(result.stats.averageQuizScore).toBe(0);
    expect(result.stats.certificatesEarned).toBe(0);
    expect(result.stats.totalSpend).toBe(0);
    expect(result.stats.studyStreakDays).toBe(0);
    expect(result.stats.studyMinutesThisWeek).toBe(0);
  });

  it('returns "INR" as default currency when no payments exist', async () => {
    const result = await service.getSummary('user-new');
    expect(result.stats.currency).toBe('INR');
  });

  it('returns exactly 7 activity entries with zero minutes', async () => {
    const result = await service.getSummary('user-new');
    expect(result.activity).toHaveLength(7);
    expect(result.activity.every((e) => e.minutes === 0)).toBe(true);
  });

  it('returns empty arrays for all list sections', async () => {
    const result = await service.getSummary('user-new');
    expect(result.continueLearning).toEqual([]);
    expect(result.recentAttempts).toEqual([]);
    expect(result.recentOrders).toEqual([]);
  });
});

describe('DashboardService.getSummary — aggregate correctness', () => {
  async function buildService(overrideResponses: unknown[][]): Promise<DashboardService> {
    let call = 0;
    const mockDb = {
      select: jest.fn().mockImplementation(() => makeChain(overrideResponses[call++] ?? [])),
    };
    const mockFilesService = { getDownloadUrl: jest.fn().mockReturnValue('http://cdn/img.jpg') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
        { provide: FilesService, useValue: mockFilesService },
      ],
    }).compile();

    return moduleRef.get(DashboardService);
  }

  it('converts decimal totalSpend string to number', async () => {
    const responses: unknown[][] = [
      [{ enrolledCount: 0, activeCount: 0, completedCount: 0 }],
      [{ lessonsCompleted: 0 }],
      [{ quizzesAttempted: 0, avgScoreRaw: null }],
      [{ certificatesEarned: 0 }],
      [{ totalSpendRaw: '4999.00', currency: 'INR' }], // Drizzle returns decimal as string
      [], [], [], [],
    ];
    const svc = await buildService(responses);
    const result = await svc.getSummary('user-1');
    expect(result.stats.totalSpend).toBe(4999);
    expect(result.stats.currency).toBe('INR');
  });

  it('rounds averageQuizScore to nearest integer', async () => {
    const responses: unknown[][] = [
      [{ enrolledCount: 0, activeCount: 0, completedCount: 0 }],
      [{ lessonsCompleted: 0 }],
      [{ quizzesAttempted: 3, avgScoreRaw: '72.666666' }],
      [{ certificatesEarned: 0 }],
      [{ totalSpendRaw: null, currency: null }],
      [], [], [], [],
    ];
    const svc = await buildService(responses);
    const result = await svc.getSummary('user-1');
    expect(result.stats.averageQuizScore).toBe(73);
  });

  it('computes studyMinutesThisWeek from activity seconds', async () => {
    // Q5 returns 2 days with activity (within 30-day window but also last 7 days)
    const NOW_ISO = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const YESTERDAY_ISO = yesterday.toISOString().slice(0, 10);

    const responses: unknown[][] = [
      [{ enrolledCount: 0, activeCount: 0, completedCount: 0 }],
      [{ lessonsCompleted: 0 }],
      [{ quizzesAttempted: 0, avgScoreRaw: null }],
      [{ certificatesEarned: 0 }],
      [{ totalSpendRaw: null, currency: null }],
      // Q5: today = 1800s (30 min), yesterday = 3600s (60 min)
      [
        { day: NOW_ISO, totalSeconds: 1800 },
        { day: YESTERDAY_ISO, totalSeconds: 3600 },
      ],
      [], [], [],
    ];
    const svc = await buildService(responses);
    const result = await svc.getSummary('user-1');
    expect(result.stats.studyMinutesThisWeek).toBe(90); // 30 + 60
  });

  it('activity array always has exactly 7 entries even with DB data', async () => {
    const NOW_ISO = new Date().toISOString().slice(0, 10);
    const responses: unknown[][] = [
      [{ enrolledCount: 0, activeCount: 0, completedCount: 0 }],
      [{ lessonsCompleted: 0 }],
      [{ quizzesAttempted: 0, avgScoreRaw: null }],
      [{ certificatesEarned: 0 }],
      [{ totalSpendRaw: null, currency: null }],
      [{ day: NOW_ISO, totalSeconds: 600 }], // only one day has data
      [], [], [],
    ];
    const svc = await buildService(responses);
    const result = await svc.getSummary('user-1');
    expect(result.activity).toHaveLength(7);
  });

  it('maps recentOrders correctly: PHONEPE gateway → MANUAL_QR', async () => {
    const orderRow = {
      paymentId: 'pay-1',
      amount: '500.00',
      originalAmount: '500.00',
      discountAmount: '0.00',
      currency: 'INR',
      gateway: 'PHONEPE', // not in frontend Order.gateway union
      status: 'COMPLETED',
      transactionId: null,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      payerName: 'Ravi Kumar',
      userEmail: 'ravi@example.com',
    };
    const responses: unknown[][] = [
      [{ enrolledCount: 0, activeCount: 0, completedCount: 0 }],
      [{ lessonsCompleted: 0 }],
      [{ quizzesAttempted: 0, avgScoreRaw: null }],
      [{ certificatesEarned: 0 }],
      [{ totalSpendRaw: null, currency: null }],
      [],
      [],
      [],
      [orderRow],
    ];
    const svc = await buildService(responses);
    const result = await svc.getSummary('user-1');
    expect(result.recentOrders).toHaveLength(1);
    expect(result.recentOrders[0].gateway).toBe('MANUAL_QR');
    expect(result.recentOrders[0].total).toBe(500);
    expect(result.recentOrders[0].billingEmail).toBe('ravi@example.com');
    expect(result.recentOrders[0].invoiceNo).toBe(''); // [Q] defaulted
    expect(result.recentOrders[0].items).toEqual([]); // [Q] defaulted
  });

  it('maps recentAttempts: scorePercent, passed, durationSeconds computed correctly', async () => {
    const attemptRow = {
      attemptId: 'att-1',
      quizId: 'quiz-1',
      startedAt: new Date('2024-01-15T09:00:00Z'),
      submittedAt: new Date('2024-01-15T09:30:00Z'), // 30 minutes = 1800 seconds
      score: '80.00',
      maxScore: '100.00',
      correctCount: 8,
      quizTitle: 'Physics Mock Test',
      passingPercent: '60.00',
    };
    const responses: unknown[][] = [
      [{ enrolledCount: 0, activeCount: 0, completedCount: 0 }],
      [{ lessonsCompleted: 0 }],
      [{ quizzesAttempted: 0, avgScoreRaw: null }],
      [{ certificatesEarned: 0 }],
      [{ totalSpendRaw: null, currency: null }],
      [], [],
      [attemptRow],
      [],
    ];
    const svc = await buildService(responses);
    const result = await svc.getSummary('user-1');
    expect(result.recentAttempts).toHaveLength(1);
    const attempt = result.recentAttempts[0];
    expect(attempt.scorePercent).toBe(80);
    expect(attempt.passMark).toBe(60);
    expect(attempt.passed).toBe(true);
    expect(attempt.durationSeconds).toBe(1800);
    expect(attempt.correctCount).toBe(8);
    expect(attempt.quizTitle).toBe('Physics Mock Test');
    expect(attempt.answers).toEqual([]); // [Q] defaulted
  });
});
