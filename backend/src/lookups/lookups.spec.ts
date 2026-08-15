/**
 * Lookups spec.
 *
 * Covers:
 *  1. List endpoint returns the pagination envelope.
 *  2. limit=1000 rejected by DTO validation.
 *  3. Duplicate code → 409 ConflictException.
 *  4. Missing row → 404 NotFoundException.
 *  5. currencies.rate returned as a number (not a string).
 *
 * The database is mocked at the DI boundary so no real connection is needed.
 */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DATABASE_CONNECTION } from '../database/database.module';
import { FilterLookupsDto } from './dto/filter-lookups.dto';
import { SiteLanguagesService } from './site-languages.service';
import { CurrenciesService } from './currencies.service';

// ---------------------------------------------------------------------------
// Drizzle query-builder mock
//
// The data query chain: .select().from().where().orderBy().limit().offset()
// The count query chain: .select().from().where()   (awaitable directly)
// ---------------------------------------------------------------------------

function makeDbMock(
  dataRows: unknown[],
  countValue: number,
  insertReturn?: unknown,
) {
  let selectCallCount = 0;

  return {
    select: jest.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // data query
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(dataRows),
                }),
              }),
              // for findOne: .where().limit()
              limit: jest.fn().mockResolvedValue(dataRows),
            }),
          }),
        };
      }
      // count query — where() resolves directly
      return {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: countValue }]),
        }),
      };
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(
          insertReturn !== undefined ? [insertReturn] : [],
        ),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(
            insertReturn !== undefined ? [insertReturn] : [],
          ),
        }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    }),
  };
}

// ---------------------------------------------------------------------------
// 1. List returns the pagination envelope
// ---------------------------------------------------------------------------

describe('SiteLanguagesService › findAll — pagination envelope', () => {
  let service: SiteLanguagesService;

  const fakeLang = {
    id: 'lang-1',
    name: 'English',
    code: 'en',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const dbMock = makeDbMock([fakeLang], 1);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SiteLanguagesService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(SiteLanguagesService);
  });

  it('wraps rows in { data, pagination }', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(Array.isArray(result.data)).toBe(true);

    const { pagination } = result;
    expect(pagination).toHaveProperty('page', 1);
    expect(pagination).toHaveProperty('limit', 10);
    expect(pagination).toHaveProperty('total', 1);
    expect(pagination).toHaveProperty('totalPages', 1);
  });
});

// ---------------------------------------------------------------------------
// 2. limit=1000 rejected by DTO validation
// ---------------------------------------------------------------------------

describe('FilterLookupsDto › limit cap', () => {
  it('rejects limit: 1000 (above max 100)', async () => {
    const dto = plainToInstance(FilterLookupsDto, { limit: 1000 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors.length).toBeGreaterThan(0);
  });

  it('accepts limit: 100 (at max)', async () => {
    const dto = plainToInstance(FilterLookupsDto, { limit: 100 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Duplicate code → 409 ConflictException
// ---------------------------------------------------------------------------

describe('SiteLanguagesService › create — duplicate code → 409', () => {
  let service: SiteLanguagesService;

  beforeEach(async () => {
    // The pre-flight select returns an existing row → service must 409.
    const existingRow = { id: 'existing-id' };
    const dbMock = makeDbMock([existingRow], 1);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SiteLanguagesService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(SiteLanguagesService);
  });

  it('throws ConflictException when the code is already taken', async () => {
    await expect(
      service.create({ name: 'English', code: 'en' }),
    ).rejects.toThrow(ConflictException);
  });
});

// ---------------------------------------------------------------------------
// 4. Missing row → 404 NotFoundException
// ---------------------------------------------------------------------------

describe('SiteLanguagesService › findOne — 404 on missing row', () => {
  let service: SiteLanguagesService;

  beforeEach(async () => {
    // select returns no rows
    const dbMock = makeDbMock([], 0);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SiteLanguagesService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(SiteLanguagesService);
  });

  it('throws NotFoundException for a missing id', async () => {
    await expect(service.findOne('does-not-exist')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. currencies.rate is returned as a number (not a string)
// ---------------------------------------------------------------------------

describe('CurrenciesService › findAll — rate is a number', () => {
  let service: CurrenciesService;

  const fakeCurrency = {
    id: 'cur-1',
    name: 'US Dollar',
    code: 'USD',
    symbol: '$',
    rate: '1.200000',   // Drizzle returns decimal as string
    position: 'before' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const dbMock = makeDbMock([fakeCurrency], 1);

    const moduleRef = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(CurrenciesService);
  });

  it('converts rate from string to number in the response', async () => {
    const result = await service.findAll({});
    expect(result.data).toHaveLength(1);
    const currency = result.data[0];
    expect(typeof currency.rate).toBe('number');
    expect(currency.rate).toBeCloseTo(1.2);
  });
});
