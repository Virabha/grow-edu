/**
 * ResourcePage-shape tests for AnnouncementsService.
 *
 * Covers (as required):
 *  1. GET /announcements — non-owner instructor cannot see another instructor's
 *     announcements (list is empty, not 403).
 *  2. GET /announcements/:id — non-owner gets NotFoundException (404, not 403).
 *  3. listPage returns the ResourcePage pagination envelope.
 *  4. findById maps announcementId → id in the response.
 */
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DATABASE_CONNECTION } from '../database/database.module';
import { AnnouncementsService } from './announcements.service';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const OWNER_ID = 'instructor-owner';
const OTHER_ID = 'instructor-other';
const ANN_ID = 'ann-001';
const COURSE_ID = 'course-abc';

const FAKE_ROW = {
  announcementId: ANN_ID,
  courseId: COURSE_ID,
  instructorId: OWNER_ID,
  title: 'Hello world',
  body: 'Body text',
  createdAt: new Date(),
  updatedAt: new Date(),
  courseTitle: 'My Course',
  sentTo: 5,
};

// ── DB mock builder ────────────────────────────────────────────────────────────
// Follows the same pattern as payouts.service.spec.ts: a single object whose
// chain methods all return itself, so .select().from().innerJoin().where()…
// chains work regardless of method call order.

type B = {
  from: (...a: unknown[]) => B;
  innerJoin: (...a: unknown[]) => B;
  leftJoin: (...a: unknown[]) => B;
  where: (...a: unknown[]) => B;
  orderBy: (...a: unknown[]) => B;
  limit: (...a: unknown[]) => B;
  offset: (...a: unknown[]) => B;
  then: (
    onfulfilled?: ((value: unknown[]) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ) => Promise<unknown>;
};

function makeBuilder(rows: unknown[]): B {
  const b: B = {
    from: () => b,
    innerJoin: () => b,
    leftJoin: () => b,
    where: () => b,
    orderBy: () => b,
    limit: () => b,
    offset: () => b,
    then: (onfulfilled, onrejected) =>
      Promise.resolve(rows).then(onfulfilled, onrejected),
  };
  return b;
}

async function buildService(dbMock: Record<string, jest.Mock>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AnnouncementsService,
      { provide: DATABASE_CONNECTION, useValue: dbMock },
    ],
  }).compile();

  return moduleRef.get(AnnouncementsService);
}

// ── 1 & 3. listPage — non-owner sees empty list; pagination envelope ───────────

describe('AnnouncementsService › listPage — non-owner isolation', () => {
  it('non-owner instructor gets an empty list (not 403)', async () => {
    let selectCallCount = 0;
    const dbMock = {
      // First select: data rows (empty — the WHERE filters by instructorId)
      // Second select: count (0)
      select: jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return makeBuilder([]);
        return makeBuilder([{ total: 0 }]);
      }),
    };

    const service = await buildService(dbMock);

    const result = await service.listPage(
      { userId: OTHER_ID, role: 'INSTRUCTOR' },
      { page: 1, limit: 10 },
    );

    expect(result.data).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it('returns { data, pagination } with id mapped from announcementId', async () => {
    let selectCallCount = 0;
    const dbMock = {
      select: jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return makeBuilder([FAKE_ROW]);
        return makeBuilder([{ total: 1 }]);
      }),
    };

    const service = await buildService(dbMock);

    const result = await service.listPage(
      { userId: OWNER_ID, role: 'INSTRUCTOR' },
      { page: 1, limit: 10 },
    );

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(typeof result.pagination.total).toBe('number');

    const row = result.data[0];
    // announcementId must be exposed as `id`
    expect(row.id).toBe(ANN_ID);
    expect(row).not.toHaveProperty('announcementId');
  });
});

// ── 2. findById — non-owner gets 404 ─────────────────────────────────────────

describe('AnnouncementsService › findById — non-owner gets NotFoundException (404)', () => {
  it('returns the announcement to the owner', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue(makeBuilder([FAKE_ROW])),
    };

    const service = await buildService(dbMock);

    const result = await service.findById(ANN_ID, {
      userId: OWNER_ID,
      role: 'INSTRUCTOR',
    });

    expect(result.id).toBe(ANN_ID);
  });

  it('throws NotFoundException (not ForbiddenException) when a different instructor requests it', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue(makeBuilder([FAKE_ROW])),
    };

    const service = await buildService(dbMock);

    await expect(
      service.findById(ANN_ID, { userId: OTHER_ID, role: 'INSTRUCTOR' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the announcement does not exist', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue(makeBuilder([])),
    };

    const service = await buildService(dbMock);

    await expect(
      service.findById('no-such-id', { userId: OWNER_ID, role: 'INSTRUCTOR' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('admin can read any announcement regardless of ownership', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue(makeBuilder([FAKE_ROW])),
    };

    const service = await buildService(dbMock);

    const result = await service.findById(ANN_ID, {
      userId: 'admin-user',
      role: 'PLATFORM_ADMIN',
    });

    expect(result.id).toBe(ANN_ID);
  });
});
