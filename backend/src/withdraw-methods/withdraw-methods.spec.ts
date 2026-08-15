/**
 * Tests for the WithdrawMethodsService and DTO validation.
 *
 * Covers (as required):
 *  1. List endpoint returns the ResourcePage pagination envelope.
 *  2. limit=1000 is rejected by DTO validation (max is 100 from PaginationDto).
 *  3. Missing row → 404 NotFoundException.
 *
 * The database is mocked at the DI boundary — no real connection needed.
 */
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DATABASE_CONNECTION } from '../database/database.module';
import { WithdrawMethodsService } from './withdraw-methods.service';
import { FilterWithdrawMethodsDto } from './dto/filter-withdraw-methods.dto';

// ── 1. Pagination envelope ─────────────────────────────────────────────────────

describe('WithdrawMethodsService › findAll — pagination envelope', () => {
  let service: WithdrawMethodsService;

  const fakeRow = {
    id: 'wm-1',
    name: 'Bank Transfer',
    description: null,
    minAmount: '100.00',
    maxAmount: null,
    processingDays: 3,
    feePercent: '1.50',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    let callCount = 0;
    const dbMock = {
      select: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // data query chain
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    offset: jest.fn().mockResolvedValue([fakeRow]),
                  }),
                }),
              }),
            }),
          };
        }
        // count query chain
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ total: 1 }]),
          }),
        };
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WithdrawMethodsService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(WithdrawMethodsService);
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

  it('converts decimal minAmount string to number in response', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });
    const row = result.data[0];
    expect(typeof row.minAmount).toBe('number');
    expect(row.minAmount).toBeCloseTo(100.0, 2);
  });

  it('converts decimal feePercent string to number in response', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });
    const row = result.data[0];
    expect(typeof row.feePercent).toBe('number');
    expect(row.feePercent).toBeCloseTo(1.5, 2);
  });
});

// ── 2. limit=1000 rejected ─────────────────────────────────────────────────────

describe('FilterWithdrawMethodsDto › limit cap', () => {
  it('rejects limit: 1000 (above max 100)', async () => {
    const dto = plainToInstance(FilterWithdrawMethodsDto, { limit: 1000 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('accepts limit: 100 (at max)', async () => {
    const dto = plainToInstance(FilterWithdrawMethodsDto, { limit: 100 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(false);
  });
});

// ── 3. Missing row → 404 ──────────────────────────────────────────────────────

describe('WithdrawMethodsService › findOne — 404 on missing row', () => {
  let service: WithdrawMethodsService;

  beforeEach(async () => {
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
        WithdrawMethodsService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(WithdrawMethodsService);
  });

  it('throws NotFoundException when the row does not exist', async () => {
    await expect(service.findOne('does-not-exist')).rejects.toThrow(
      NotFoundException,
    );
  });
});
