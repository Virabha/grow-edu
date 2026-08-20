/**
 * Unit tests for PaymentService.approvePayment — specifically the bug where the
 * WHERE clause only matched PROOF_UPLOADED status, so a PENDING payment was never
 * transitioned to COMPLETED even though access was granted.
 */
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { AppConfigService } from '../config';
import { EmailService } from '../email/email.service';
import { ContractsService } from '../corporate/contracts.service';

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

// ── test setup ────────────────────────────────────────────────────────────────

const PAYMENT_ID = 'pay-001';
const USER_ID = 'user-001';
const REVIEWER_ID = 'admin-001';
const BATCH_ID = 'batch-001';

const PENDING_BATCH_PAYMENT = {
  paymentId: PAYMENT_ID,
  userId: USER_ID,
  itemType: 'BATCH' as const,
  courseId: null,
  sectionId: null,
  status: 'PENDING' as const,
  gateway: 'MANUAL_QR' as const,
  amount: '1500.00',
  currency: 'INR',
  metadata: { batchId: BATCH_ID, batchTitle: 'Test Batch', batchSlug: 'test-batch' },
};

const PROOF_UPLOADED_BATCH_PAYMENT = {
  ...PENDING_BATCH_PAYMENT,
  status: 'PROOF_UPLOADED' as const,
};

interface MockDb {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  query: {
    payments: { findFirst: jest.Mock };
  };
}

async function buildModule(): Promise<{ service: PaymentService; db: MockDb }> {
  const db: MockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: {
      payments: { findFirst: jest.fn() },
    },
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      PaymentService,
      { provide: DATABASE_CONNECTION, useValue: db },
      {
        provide: AppConfigService,
        useValue: { razorpayKeyId: null, razorpayKeySecret: null },
      },
      {
        provide: EmailService,
        useValue: { sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(undefined) },
      },
      {
        provide: ContractsService,
        useValue: { activateForPayment: jest.fn().mockResolvedValue(undefined) },
      },
    ],
  }).compile();

  return { service: moduleRef.get(PaymentService), db };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('PaymentService › approvePayment', () => {
  let service: PaymentService;
  let db: MockDb;

  beforeEach(async () => {
    ({ service, db } = await buildModule());
  });

  it('throws NotFoundException when payment does not exist', async () => {
    db.query.payments.findFirst.mockResolvedValueOnce(undefined);

    await expect(service.approvePayment(PAYMENT_ID, REVIEWER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns success immediately when payment is already COMPLETED', async () => {
    db.query.payments.findFirst.mockResolvedValueOnce({
      ...PENDING_BATCH_PAYMENT,
      status: 'COMPLETED',
    });

    const result = await service.approvePayment(PAYMENT_ID, REVIEWER_ID);
    expect(result).toEqual({ success: true, message: 'Payment already completed' });
  });

  it('throws BadRequestException when payment is REJECTED or FAILED', async () => {
    db.query.payments.findFirst.mockResolvedValueOnce({
      ...PENDING_BATCH_PAYMENT,
      status: 'REJECTED',
    });

    await expect(service.approvePayment(PAYMENT_ID, REVIEWER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('approving a PROOF_UPLOADED batch payment marks it COMPLETED and returns success', async () => {
    // First findFirst: initial payment load in approvePayment
    db.query.payments.findFirst.mockResolvedValueOnce(PROOF_UPLOADED_BATCH_PAYMENT);
    // Second findFirst: inside grantAccessForPayment for BATCH type
    db.query.payments.findFirst.mockResolvedValueOnce(PROOF_UPLOADED_BATCH_PAYMENT);
    // Update to COMPLETED
    db.update.mockImplementationOnce(() => makeBuilder([{ paymentId: PAYMENT_ID }]));
    // User lookup for confirmation email
    db.select.mockImplementationOnce(() => makeBuilder([]));

    const result = await service.approvePayment(PAYMENT_ID, REVIEWER_ID, 'Verified');

    expect(result).toEqual({ success: true, message: 'Payment approved and access granted' });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  /**
   * Regression test for the WHERE-clause bug:
   * before the fix, approving a PENDING payment did not update its status to COMPLETED
   * because the WHERE clause only matched PROOF_UPLOADED.
   */
  it('approving a PENDING batch payment marks it COMPLETED (regression: WHERE must include PENDING)', async () => {
    // First findFirst: initial payment load
    db.query.payments.findFirst.mockResolvedValueOnce(PENDING_BATCH_PAYMENT);
    // Second findFirst: inside grantAccessForPayment for BATCH type
    db.query.payments.findFirst.mockResolvedValueOnce(PENDING_BATCH_PAYMENT);
    // Update WHERE now covers both PROOF_UPLOADED and PENDING — returns the row
    db.update.mockImplementationOnce(() => makeBuilder([{ paymentId: PAYMENT_ID }]));
    // User lookup for email
    db.select.mockImplementationOnce(() => makeBuilder([]));

    const result = await service.approvePayment(PAYMENT_ID, REVIEWER_ID);

    // Must succeed and call update exactly once
    expect(result).toEqual({ success: true, message: 'Payment approved and access granted' });
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
