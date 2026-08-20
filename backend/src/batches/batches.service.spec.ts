/**
 * Unit tests for the three bugs fixed in batches.service.ts:
 *
 * 1. Duplicate slug must surface ConflictException (409), not BadRequestException (400).
 * 2. Admin bulk-enrol must respect batch capacity and throw BadRequestException
 *    when the batch is already full or the requested count would exceed remaining capacity.
 *
 * Both tests use an in-memory fake of the Drizzle db interface so they run
 * without a real database connection.
 */
import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { DATABASE_CONNECTION } from "../database/database.module";
import { CacheService } from "../cache/cache.service";
import { CdnService } from "../cdn/cdn.service";
import { EmailService } from "../email/email.service";
import { FilesService } from "../files/files.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentService } from "../payment/payment.service";
import { BatchesService } from "./batches.service";

// ─── Minimal stubs ────────────────────────────────────────────────────────────

/**
 * Build a BatchesService with injected fakes.
 *
 * The collaborators are resolved through the Nest testing module rather than
 * the constructor directly, so the stubs stay as small as each test needs
 * without the call site having to restate the real dependency types.
 */
async function makeService(dbOverrides: Record<string, jest.Mock>) {
  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...dbOverrides,
  };

  const noop = () => Promise.resolve();
  const moduleRef = await Test.createTestingModule({
    providers: [
      BatchesService,
      { provide: DATABASE_CONNECTION, useValue: db },
      { provide: FilesService, useValue: { getDownloadUrl: () => "" } },
      { provide: CdnService, useValue: { getSignedEmbedUrl: () => "" } },
      {
        provide: CacheService,
        useValue: { get: () => Promise.resolve(null), set: noop, delByPrefix: noop },
      },
      { provide: EmailService, useValue: { send: noop } },
      { provide: NotificationsService, useValue: { create: noop, fanout: noop } },
      { provide: PaymentService, useValue: { registerBatchEnrollHandler: noop } },
    ],
  }).compile();

  return moduleRef.get(BatchesService);
}

// ─── 1. Duplicate slug → ConflictException ────────────────────────────────────

describe("BatchesService › create › duplicate slug", () => {
  it("throws ConflictException (409) when the slug is already taken", async () => {
    // First select returns the existing batch (slug conflict).
    const existingBatch = { batchId: "existing-uuid" };
    const selectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([existingBatch]),
    };
    const dbSelect = jest.fn().mockReturnValue(selectChain);

    const service = await makeService({ select: dbSelect });

    const dto = {
      title: "Test Batch",
      slug: "duplicate-slug",
      price: 0,
      startDate: new Date(Date.now() + 86400_000).toISOString(),
      endDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      language: "English",
    };

    await expect(service.create(dto as never, "user-id")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("does not throw BadRequestException for a duplicate slug", async () => {
    const existingBatch = { batchId: "existing-uuid" };
    const selectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([existingBatch]),
    };
    const service = await makeService({ select: jest.fn().mockReturnValue(selectChain) });

    const dto = {
      title: "Test Batch",
      slug: "duplicate-slug",
      price: 0,
      startDate: new Date(Date.now() + 86400_000).toISOString(),
      endDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      language: "English",
    };

    const err = await service.create(dto as never, "user-id").catch((e) => e);
    expect(err).not.toBeInstanceOf(BadRequestException);
  });
});

// ─── 2. addEnrollments › capacity ────────────────────────────────────────────

describe("BatchesService › addEnrollments › capacity guard", () => {
  it("throws BadRequestException when capacity is full (0 slots remain)", async () => {
    // We'll stub at the service method level to isolate capacity logic.
    // The service calls:
    //   1. getBatchOrThrow → returns batch with capacity=1
    //   2. select existing enrolments for dedup → returns [] (no overlap)
    //   3. select count(*) active enrolments → returns [{count:1}]  (full)
    let dbCallIndex = 0;
    const selectMock = jest.fn().mockImplementation(() => {
      dbCallIndex++;
      if (dbCallIndex === 1) {
        // getBatchOrThrow
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([
            {
              batchId: "batch-uuid",
              capacity: 1,
              isDeleted: false,
              endDate: new Date(Date.now() + 30 * 86400_000),
            },
          ]),
        };
      }
      if (dbCallIndex === 2) {
        // existing enrolments for dedup — returns nothing (student2 not enrolled)
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          // Drizzle select without .limit() resolves as Promise<rows[]>
          then: (resolve: (v: unknown[]) => void) => resolve([]),
        };
      }
      // dbCallIndex === 3: capacity count
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: (resolve: (v: unknown[]) => void) => resolve([{ count: 1 }]),
      };
    });

    const service = await makeService({ select: selectMock });

    await expect(
      service.addEnrollments(
        "batch-uuid",
        { userIds: ["student2-uuid"] },
        "admin-uuid",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws BadRequestException when enrolment count would exceed capacity", async () => {
    // batch capacity=2, 1 active, trying to enrol 2 more → would need 3 slots total
    let dbCallIndex = 0;
    const selectMock = jest.fn().mockImplementation(() => {
      dbCallIndex++;
      if (dbCallIndex === 1) {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([
            {
              batchId: "batch-uuid",
              capacity: 2,
              isDeleted: false,
              endDate: new Date(Date.now() + 30 * 86400_000),
            },
          ]),
        };
      }
      if (dbCallIndex === 2) {
        // dedup check: neither student is already enrolled
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          then: (resolve: (v: unknown[]) => void) => resolve([]),
        };
      }
      // capacity count: 1 active enrolment
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: (resolve: (v: unknown[]) => void) => resolve([{ count: 1 }]),
      };
    });

    const service = await makeService({ select: selectMock });

    await expect(
      service.addEnrollments(
        "batch-uuid",
        { userIds: ["student2-uuid", "student3-uuid"] },
        "admin-uuid",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("succeeds when slots are available", async () => {
    // capacity=3, 1 active, enrolling 1 more → 1 slot used, OK
    let dbCallIndex = 0;
    const insertMock = jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });
    const selectMock = jest.fn().mockImplementation(() => {
      dbCallIndex++;
      if (dbCallIndex === 1) {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([
            {
              batchId: "batch-uuid",
              capacity: 3,
              isDeleted: false,
              endDate: new Date(Date.now() + 30 * 86400_000),
            },
          ]),
        };
      }
      if (dbCallIndex === 2) {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          then: (resolve: (v: unknown[]) => void) => resolve([]),
        };
      }
      // capacity count: 1 active
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: (resolve: (v: unknown[]) => void) => resolve([{ count: 1 }]),
      };
    });

    const service = await makeService({ select: selectMock, insert: insertMock });

    const result = await service.addEnrollments(
      "batch-uuid",
      { userIds: ["student2-uuid"] },
      "admin-uuid",
    );
    expect(result.enrolled).toBe(1);
  });
});
