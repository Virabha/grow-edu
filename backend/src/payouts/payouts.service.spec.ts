/**
 * Unit tests for PayoutsService.
 *
 * The database is replaced with a mock whose select/insert/delete methods
 * return a "builder" object: a thenable that also exposes all of the drizzle
 * query-builder chain methods (from, innerJoin, where, …) — each returning
 * the same object so chaining works.  When the service does
 *   `await db.select({...}).from(T).innerJoin(…).where(…)`
 * it calls `.then()` on the returned chain, which resolves to the rows we
 * configured per-call with `mockImplementationOnce`.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PayoutsService } from './payouts.service';
import { DATABASE_CONNECTION } from '../database/database.module';

// ── chain builder ─────────────────────────────────────────────────────────────

/**
 * Creates a thenable builder whose chain methods all return itself.
 * Passing it to `mockImplementationOnce` makes `await db.select(…).from(…).where(…)`
 * resolve to `rows`.
 */
function makeBuilder(rows: unknown[]) {
  type B = {
    from: (...a: unknown[]) => B;
    innerJoin: (...a: unknown[]) => B;
    leftJoin: (...a: unknown[]) => B;
    where: (...a: unknown[]) => B;
    orderBy: (...a: unknown[]) => B;
    limit: (...a: unknown[]) => B;
    offset: (...a: unknown[]) => B;
    values: (...a: unknown[]) => B;
    set: (...a: unknown[]) => B;
    returning: (...a: unknown[]) => Promise<unknown[]>;
    then: (
      onfulfilled?: ((value: unknown[]) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) => Promise<unknown>;
  };

  const b: B = {
    from: () => b,
    innerJoin: () => b,
    leftJoin: () => b,
    where: () => b,
    orderBy: () => b,
    limit: () => b,
    offset: () => b,
    values: () => b,
    set: () => b,
    returning: () => Promise.resolve(rows),
    then: (onfulfilled, onrejected) =>
      Promise.resolve(rows).then(onfulfilled, onrejected),
  };
  return b;
}

// ── test setup ────────────────────────────────────────────────────────────────

const INSTRUCTOR_ID = 'instructor-abc';
const OTHER_ID = 'instructor-xyz';
const PAYOUT_ID = 'payout-001';

interface MockDb {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

async function buildModule(): Promise<{ service: PayoutsService; db: MockDb }> {
  const db: MockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      PayoutsService,
      { provide: DATABASE_CONNECTION, useValue: db },
    ],
  }).compile();

  return { service: moduleRef.get(PayoutsService), db };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('PayoutsService › getEarnings', () => {
  let service: PayoutsService;
  let db: MockDb;

  beforeEach(async () => {
    ({ service, db } = await buildModule());
  });

  it('computes currentBalance = lifetimeGross − totalClaimed (PENDING+APPROVED+PAID)', async () => {
    // Call 1: lifetime gross (sum of COMPLETED payments)
    db.select.mockImplementationOnce(() => makeBuilder([{ total: '347.40' }]));
    // Call 2: courses sold (count)
    db.select.mockImplementationOnce(() => makeBuilder([{ total: 1 }]));
    // Call 3: total claimed (PENDING+APPROVED+PAID payouts)
    db.select.mockImplementationOnce(() => makeBuilder([{ total: '50.00' }]));
    // Call 4: total disbursed (PAID payouts only)
    db.select.mockImplementationOnce(() => makeBuilder([{ total: '0.00' }]));

    const result = await service.getEarnings(INSTRUCTOR_ID);

    expect(result.lifetimeGross).toBeCloseTo(347.40, 2);
    expect(result.currentBalance).toBeCloseTo(297.40, 2); // 347.40 - 50.00
    expect(result.coursesSold).toBe(1);
    expect(result.totalPayout).toBeCloseTo(0, 2);
  });

  it('currentBalance is clamped to 0 when payouts exceed earnings', async () => {
    db.select.mockImplementationOnce(() => makeBuilder([{ total: '10.00' }]));
    db.select.mockImplementationOnce(() => makeBuilder([{ total: 1 }]));
    db.select.mockImplementationOnce(() => makeBuilder([{ total: '100.00' }]));
    db.select.mockImplementationOnce(() => makeBuilder([{ total: '100.00' }]));

    const result = await service.getEarnings(INSTRUCTOR_ID);

    expect(result.currentBalance).toBe(0); // never negative
    expect(result.lifetimeGross).toBeCloseTo(10.00, 2);
  });

  it('returns zeros when there are no payments', async () => {
    db.select.mockImplementationOnce(() => makeBuilder([{ total: null }]));
    db.select.mockImplementationOnce(() => makeBuilder([{ total: 0 }]));
    db.select.mockImplementationOnce(() => makeBuilder([{ total: null }]));
    db.select.mockImplementationOnce(() => makeBuilder([{ total: null }]));

    const result = await service.getEarnings(INSTRUCTOR_ID);

    expect(result.lifetimeGross).toBe(0);
    expect(result.currentBalance).toBe(0);
    expect(result.coursesSold).toBe(0);
    expect(result.totalPayout).toBe(0);
  });
});

describe('PayoutsService › createPayout (over-request rejection)', () => {
  let service: PayoutsService;

  beforeEach(async () => {
    ({ service } = await buildModule());
  });

  it('throws BadRequestException when requested amount exceeds available balance', async () => {
    // Spy on getEarnings so we can control the returned balance without
    // setting up 4 select calls.
    jest.spyOn(service, 'getEarnings').mockResolvedValue({
      currentBalance: 50,
      coursesSold: 1,
      totalPayout: 0,
      lifetimeGross: 100,
    });

    await expect(
      service.createPayout(INSTRUCTOR_ID, { amount: 100, method: 'PayPal' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException with a message containing the balance', async () => {
    jest.spyOn(service, 'getEarnings').mockResolvedValue({
      currentBalance: 30,
      coursesSold: 1,
      totalPayout: 0,
      lifetimeGross: 30,
    });

    await expect(
      service.createPayout(INSTRUCTOR_ID, { amount: 31, method: 'Bank Transfer' }),
    ).rejects.toThrow(/30\.00/);
  });
});

describe('PayoutsService › cancelPayout', () => {
  let service: PayoutsService;
  let db: MockDb;

  beforeEach(async () => {
    ({ service, db } = await buildModule());
  });

  it('throws BadRequestException when trying to cancel a non-PENDING request', async () => {
    db.select.mockImplementationOnce(() =>
      makeBuilder([
        {
          payoutId: PAYOUT_ID,
          instructorId: INSTRUCTOR_ID,
          status: 'APPROVED',
          amount: '100.00',
          currency: 'INR',
          method: 'PayPal',
        },
      ]),
    );

    await expect(
      service.cancelPayout(PAYOUT_ID, INSTRUCTOR_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for REJECTED status', async () => {
    db.select.mockImplementationOnce(() =>
      makeBuilder([
        {
          payoutId: PAYOUT_ID,
          instructorId: INSTRUCTOR_ID,
          status: 'REJECTED',
          amount: '100.00',
          currency: 'INR',
          method: 'PayPal',
        },
      ]),
    );

    await expect(
      service.cancelPayout(PAYOUT_ID, INSTRUCTOR_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for PAID status', async () => {
    db.select.mockImplementationOnce(() =>
      makeBuilder([
        {
          payoutId: PAYOUT_ID,
          instructorId: INSTRUCTOR_ID,
          status: 'PAID',
          amount: '100.00',
          currency: 'INR',
          method: 'PayPal',
        },
      ]),
    );

    await expect(
      service.cancelPayout(PAYOUT_ID, INSTRUCTOR_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('succeeds when the request is PENDING and belongs to the caller', async () => {
    db.select.mockImplementationOnce(() =>
      makeBuilder([
        {
          payoutId: PAYOUT_ID,
          instructorId: INSTRUCTOR_ID,
          status: 'PENDING',
          amount: '100.00',
          currency: 'INR',
          method: 'PayPal',
        },
      ]),
    );
    db.delete.mockImplementationOnce(() => makeBuilder([]));

    const result = await service.cancelPayout(PAYOUT_ID, INSTRUCTOR_ID);

    expect(result.deleted).toBe(true);
    expect(result.payoutId).toBe(PAYOUT_ID);
  });
});

describe('PayoutsService › cancelPayout (cross-instructor denial)', () => {
  let service: PayoutsService;
  let db: MockDb;

  beforeEach(async () => {
    ({ service, db } = await buildModule());
  });

  it('returns 404 (not 403) when the payout belongs to a different instructor', async () => {
    // Payout exists but belongs to OTHER_ID, not the caller (INSTRUCTOR_ID)
    db.select.mockImplementationOnce(() =>
      makeBuilder([
        {
          payoutId: PAYOUT_ID,
          instructorId: OTHER_ID, // ← different instructor
          status: 'PENDING',
          amount: '100.00',
          currency: 'INR',
          method: 'PayPal',
        },
      ]),
    );

    await expect(
      service.cancelPayout(PAYOUT_ID, INSTRUCTOR_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns 404 when the payout does not exist at all', async () => {
    db.select.mockImplementationOnce(() => makeBuilder([])); // empty result

    await expect(
      service.cancelPayout(PAYOUT_ID, INSTRUCTOR_ID),
    ).rejects.toThrow(NotFoundException);
  });
});
