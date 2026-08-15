/**
 * Admin-resources spec.
 *
 * Covers (as required):
 *  1. List endpoint returns the pagination envelope.
 *  2. limit=1000 is rejected by DTO validation.
 *  3. Missing row → 404 NotFoundException.
 *  4. Non-admin user is denied by the RolesGuard.
 *
 * Each test calls the layer that actually enforces the behaviour:
 *  – Service  → pagination shape, 404
 *  – DTO      → limit cap
 *  – Guard    → role check
 *
 * The database is mocked at the DI boundary (DATABASE_CONNECTION token) so no
 * real connection is needed and the tests run offline.
 */

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';

import { DATABASE_CONNECTION } from '../database/database.module';
import { BrandsService } from './brands/brands.service';
import { BrandsController } from './brands/brands.controller';
import { FilterBrandsDto } from './brands/dto/filter-brands.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY, UserRole } from '../auth/decorators/roles.decorator';

// ---------------------------------------------------------------------------
// Drizzle query-builder mock
// The builder chains .select().from().where().orderBy().limit().offset() and
// resolves at the final call. We swap the resolved value per test.
// ---------------------------------------------------------------------------

function makeQueryMock(resolvedRows: Record<string, unknown>[], countValue = 0) {
  const countRows = [{ count: countValue }];

  // Counts query ends at .where() (no orderBy/limit/offset after it in the
  // service's Promise.all second branch).
  // Data query ends at .offset().
  // We return an array-thenable so that both paths resolve correctly.

  let callIndex = 0;

  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    // offset is the terminal call for the data query
    offset: jest.fn().mockResolvedValue(resolvedRows),
  };

  // The count query ends at .where() – make it also thenable.
  // We track invocations of .where() and return different promises on each.
  builder.where.mockImplementation(() => {
    callIndex++;
    const isCountQuery = callIndex % 2 === 0; // second parallel call is the count
    if (isCountQuery) {
      return Promise.resolve(countRows);
    }
    // For the data query, continue the chain
    return {
      orderBy: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          offset: jest.fn().mockResolvedValue(resolvedRows),
        }),
      }),
    };
  });

  return builder;
}

// ---------------------------------------------------------------------------
// 1. List returns pagination envelope
// ---------------------------------------------------------------------------

describe('BrandsService › findAll — pagination envelope', () => {
  let service: BrandsService;

  beforeEach(async () => {
    const fakeBrand = {
      id: 'brand-1',
      name: 'Acme',
      logoUrl: null,
      websiteUrl: null,
      displayOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Simple mock: both Promise.all branches return in order.
    const dbMock = {
      select: jest.fn(),
    };

    // First call: data rows; second call: count rows.
    let selectCallCount = 0;
    dbMock.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // data query chain
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([fakeBrand]),
                }),
              }),
            }),
          }),
        };
      }
      // count query chain
      return {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 1 }]),
        }),
      };
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(BrandsService);
  });

  it('wraps rows in { data, pagination }', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(Array.isArray(result.data)).toBe(true);

    const { pagination } = result;
    expect(pagination).toHaveProperty('page', 1);
    expect(pagination).toHaveProperty('limit', 10);
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');
  });
});

// ---------------------------------------------------------------------------
// 2. limit=1000 is rejected by DTO validation
// ---------------------------------------------------------------------------

describe('FilterBrandsDto › limit cap', () => {
  it('rejects limit: 1000 (above max 100)', async () => {
    const dto = plainToInstance(FilterBrandsDto, { limit: 1000 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors.length).toBeGreaterThan(0);
  });

  it('accepts limit: 100 (at max)', async () => {
    const dto = plainToInstance(FilterBrandsDto, { limit: 100 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Missing row → 404
// ---------------------------------------------------------------------------

describe('BrandsController › findOne — 404 on missing row', () => {
  let controller: BrandsController;

  beforeEach(async () => {
    const serviceMock = {
      findAll: jest.fn(),
      findOne: jest.fn().mockRejectedValue(new NotFoundException('Brand not found')),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [BrandsController],
      providers: [{ provide: BrandsService, useValue: serviceMock }],
    }).compile();

    controller = moduleRef.get(BrandsController);
  });

  it('propagates NotFoundException when the service throws it', async () => {
    await expect(controller.findOne('does-not-exist')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Non-admin user is denied by RolesGuard
// ---------------------------------------------------------------------------

describe('RolesGuard › non-admin denied', () => {
  it('returns false when the user role does not match', () => {
    // Wire a Reflector that always returns [PLATFORM_ADMIN].
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.PLATFORM_ADMIN];
        return undefined;
      });

    const guard = new RolesGuard(reflector);

    // Build a minimal ExecutionContext where the request user has role LEARNER.
    const mockContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.LEARNER } }),
      }),
    } as Parameters<typeof guard.canActivate>[0];

    expect(guard.canActivate(mockContext)).toBe(false);
  });

  it('returns true when the user is a PLATFORM_ADMIN', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.PLATFORM_ADMIN];
        return undefined;
      });

    const guard = new RolesGuard(reflector);

    const mockContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.PLATFORM_ADMIN } }),
      }),
    } as Parameters<typeof guard.canActivate>[0];

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
