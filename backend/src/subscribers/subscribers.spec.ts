/**
 * Tests for SubscribersService and DTO validation.
 *
 * Covers (as required):
 *  1. List endpoint returns the ResourcePage pagination envelope.
 *  2. Duplicate email on create → 409 ConflictException (not a raw Postgres error).
 *  3. limit=1000 is rejected by DTO validation (max is 100 from PaginationDto).
 *  4. Missing row → 404 NotFoundException.
 *  5. source field is always null (column missing from schema — see [Q] comment in service).
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DATABASE_CONNECTION } from '../database/database.module';
import { SubscribersService } from './subscribers.service';
import { FilterSubscribersDto } from './dto/filter-subscribers.dto';

// ── DB mock helpers ────────────────────────────────────────────────────────────

const FAKE_ROW = {
  id: 'sub-1',
  email: 'alice@example.com',
  subscribedAt: new Date(),
  isActive: true,
};

// ── 1. Pagination envelope ─────────────────────────────────────────────────────

describe('SubscribersService › findAll — pagination envelope', () => {
  let service: SubscribersService;

  beforeEach(async () => {
    let callCount = 0;
    const dbMock = {
      select: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    offset: jest.fn().mockResolvedValue([FAKE_ROW]),
                  }),
                }),
              }),
            }),
          };
        }
        // count query
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ total: 1 }]),
          }),
        };
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(SubscribersService);
  });

  it('returns { data: T[], pagination: { page, limit, total, totalPages } }', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(Array.isArray(result.data)).toBe(true);

    const { pagination } = result;
    expect(pagination.page).toBe(1);
    expect(pagination.limit).toBe(10);
    expect(typeof pagination.total).toBe('number');
    expect(typeof pagination.totalPages).toBe('number');
  });

  it('always returns source: null in every row (column missing from schema)', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });
    expect(result.data[0].source).toBeNull();
  });
});

// ── 2. Duplicate email → 409 ──────────────────────────────────────────────────

describe('SubscribersService › create — duplicate email → 409', () => {
  it('throws ConflictException when the email already exists', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([FAKE_ROW]),
          }),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    const service = moduleRef.get(SubscribersService);

    await expect(
      service.create({ email: FAKE_ROW.email }),
    ).rejects.toThrow(ConflictException);
  });

  it('does NOT throw on a new unique email', async () => {
    const newRow = { ...FAKE_ROW, id: 'sub-2', email: 'bob@example.com' };
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // no existing row
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newRow]),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    const service = moduleRef.get(SubscribersService);

    const result = await service.create({ email: 'bob@example.com' });
    expect(result.email).toBe('bob@example.com');
    expect(result.source).toBeNull();
  });
});

// ── 3. limit=1000 rejected ─────────────────────────────────────────────────────

describe('FilterSubscribersDto › limit cap', () => {
  it('rejects limit: 1000 (above max 100)', async () => {
    const dto = plainToInstance(FilterSubscribersDto, { limit: 1000 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('accepts limit: 100 (at max)', async () => {
    const dto = plainToInstance(FilterSubscribersDto, { limit: 100 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(false);
  });
});

// ── 4. Missing row → 404 ──────────────────────────────────────────────────────

describe('SubscribersService › findOne — 404 on missing row', () => {
  it('throws NotFoundException when the subscriber does not exist', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    const service = moduleRef.get(SubscribersService);
    await expect(service.findOne('does-not-exist')).rejects.toThrow(
      NotFoundException,
    );
  });
});
