/**
 * Unit tests for BatchesService.startBatchCheckout — specifically the bug where
 * a second checkout for the same batch+user created a duplicate PENDING payment
 * row instead of returning the existing one.
 */
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { FilesService } from '../files/files.service';
import { CdnService } from '../cdn/cdn.service';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentService } from '../payment/payment.service';

// ── chain builder ─────────────────────────────────────────────────────────────

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

// ── fixtures ──────────────────────────────────────────────────────────────────

const BATCH_ID = 'batch-001';
const USER_ID = 'user-001';
const PAYMENT_ID = 'pay-existing-001';

const FAKE_BATCH = {
  batchId: BATCH_ID,
  title: 'Test Batch',
  slug: 'test-batch',
  price: '1500.00',
  currency: 'INR',
  status: 'UPCOMING',
  capacity: null,
  endDate: new Date(Date.now() + 30 * 86400_000),
  isDeleted: false,
};

const EXISTING_PENDING_PAYMENT = {
  paymentId: PAYMENT_ID,
  userId: USER_ID,
  itemType: 'BATCH',
  status: 'PENDING',
  amount: '1500.00',
  discountAmount: '0.00',
  currency: 'INR',
  gateway: 'MANUAL_QR',
  metadata: { batchId: BATCH_ID },
};

// ── test setup ────────────────────────────────────────────────────────────────

interface MockDb {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  query: {
    payments: { findFirst: jest.Mock };
    batches: { findFirst: jest.Mock };
  };
}

async function buildModule(): Promise<{ service: BatchesService; db: MockDb }> {
  const db: MockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: {
      payments: { findFirst: jest.fn() },
      batches: { findFirst: jest.fn() },
    },
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      BatchesService,
      { provide: DATABASE_CONNECTION, useValue: db },
      {
        provide: FilesService,
        useValue: { getDownloadUrl: jest.fn().mockReturnValue(null) },
      },
      {
        provide: CdnService,
        useValue: { getSignedUrl: jest.fn().mockReturnValue(null) },
      },
      {
        provide: CacheService,
        useValue: {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn().mockResolvedValue(undefined),
          del: jest.fn().mockResolvedValue(undefined),
          delByPrefix: jest.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: EmailService,
        useValue: { sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(undefined) },
      },
      {
        provide: NotificationsService,
        useValue: { create: jest.fn().mockResolvedValue(undefined) },
      },
      {
        provide: PaymentService,
        useValue: { registerBatchEnrollHandler: jest.fn() },
      },
    ],
  }).compile();

  return { service: moduleRef.get(BatchesService), db };
}

// ── helper to set up common DB mocks for startBatchCheckout ──────────────────

/**
 * Mocks the three DB calls that happen before the deduplication check:
 *   1. getBatchOrThrow → returns batch
 *   2. existing enrollment check → returns [] (not enrolled)
 *   3. capacity check → returns [{ count: 0 }]
 */
function mockPrecheckCalls(db: MockDb, batch = FAKE_BATCH): void {
  // 1. getBatchOrThrow
  db.select.mockImplementationOnce(() => makeBuilder([batch]));
  // 2. existing ACTIVE enrollment check
  db.select.mockImplementationOnce(() => makeBuilder([]));
  // 3. capacity check (only hit when batch.capacity != null; here it's null so skip)
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('BatchesService › startBatchCheckout', () => {
  let service: BatchesService;
  let db: MockDb;

  beforeEach(async () => {
    ({ service, db } = await buildModule());
  });

  it('throws BadRequestException when batch is not UPCOMING or ONGOING', async () => {
    db.select.mockImplementationOnce(() =>
      makeBuilder([{ ...FAKE_BATCH, status: 'DRAFT' }]),
    );

    await expect(service.startBatchCheckout(BATCH_ID, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when user is already actively enrolled', async () => {
    // getBatchOrThrow
    db.select.mockImplementationOnce(() => makeBuilder([FAKE_BATCH]));
    // existing enrollment → found
    db.select.mockImplementationOnce(() =>
      makeBuilder([{ enrollmentId: 'enr-1', status: 'ACTIVE' }]),
    );

    await expect(service.startBatchCheckout(BATCH_ID, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('creates a new PENDING payment when no existing one exists', async () => {
    mockPrecheckCalls(db);
    // Deduplication check → no existing payment
    db.select.mockImplementationOnce(() => makeBuilder([]));
    // insert new payment
    db.insert.mockImplementationOnce(() =>
      makeBuilder([
        {
          paymentId: 'pay-new-001',
          amount: '1500.00',
          discountAmount: '0.00',
          status: 'PENDING',
        },
      ]),
    );

    const result = await service.startBatchCheckout(BATCH_ID, USER_ID);

    expect(result.paymentId).toBe('pay-new-001');
    expect(result.enrolled).toBe(false);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  /**
   * Regression test for the duplicate-payment bug:
   * before the fix, a second checkout for the same batch+user created a second
   * PENDING row instead of returning the first one.
   */
  it('reuses existing PENDING payment on a second checkout (regression: no duplicate rows)', async () => {
    mockPrecheckCalls(db);
    // Deduplication check → existing PENDING payment found
    db.select.mockImplementationOnce(() => makeBuilder([EXISTING_PENDING_PAYMENT]));

    const result = await service.startBatchCheckout(BATCH_ID, USER_ID);

    expect(result.paymentId).toBe(PAYMENT_ID);
    expect(result.enrolled).toBe(false);
    // Must NOT insert a new payment row
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('reuses existing PROOF_UPLOADED payment the same way', async () => {
    mockPrecheckCalls(db);
    const proofUploaded = { ...EXISTING_PENDING_PAYMENT, status: 'PROOF_UPLOADED' };
    db.select.mockImplementationOnce(() => makeBuilder([proofUploaded]));

    const result = await service.startBatchCheckout(BATCH_ID, USER_ID);

    expect(result.paymentId).toBe(PAYMENT_ID);
    expect(result.enrolled).toBe(false);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
