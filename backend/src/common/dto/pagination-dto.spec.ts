import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto › limit cap', () => {
  it('rejects limit: 1000 (above max)', async () => {
    const dto = plainToInstance(PaginationDto, { limit: 1000 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors.length).toBeGreaterThan(0);
  });

  it('rejects limit: 101 (one above max)', async () => {
    const dto = plainToInstance(PaginationDto, { limit: 101 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors.length).toBeGreaterThan(0);
  });

  it('accepts limit: 100 (at max)', async () => {
    const dto = plainToInstance(PaginationDto, { limit: 100 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors).toHaveLength(0);
  });

  it('accepts limit: 1 (at min)', async () => {
    const dto = plainToInstance(PaginationDto, { limit: 1 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors).toHaveLength(0);
  });

  it('rejects limit: 0 (below min)', async () => {
    const dto = plainToInstance(PaginationDto, { limit: 0 });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors.length).toBeGreaterThan(0);
  });

  it('accepts omitted limit (optional)', async () => {
    const dto = plainToInstance(PaginationDto, {});
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors).toHaveLength(0);
  });

  it('coerces string "50" to number and accepts it', async () => {
    const dto = plainToInstance(PaginationDto, { limit: '50' });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors).toHaveLength(0);
    expect(dto.limit).toBe(50);
  });

  it('coerces string "1000" to number and rejects it', async () => {
    const dto = plainToInstance(PaginationDto, { limit: '1000' });
    const errors = await validate(dto);
    const limitErrors = errors.filter((e) => e.property === 'limit');
    expect(limitErrors.length).toBeGreaterThan(0);
  });
});

describe('PaginationDto › page validation', () => {
  it('accepts page: 1', async () => {
    const dto = plainToInstance(PaginationDto, { page: 1 });
    const errors = await validate(dto);
    const pageErrors = errors.filter((e) => e.property === 'page');
    expect(pageErrors).toHaveLength(0);
  });

  it('rejects page: 0', async () => {
    const dto = plainToInstance(PaginationDto, { page: 0 });
    const errors = await validate(dto);
    const pageErrors = errors.filter((e) => e.property === 'page');
    expect(pageErrors.length).toBeGreaterThan(0);
  });

  it('rejects page: -1', async () => {
    const dto = plainToInstance(PaginationDto, { page: -1 });
    const errors = await validate(dto);
    const pageErrors = errors.filter((e) => e.property === 'page');
    expect(pageErrors.length).toBeGreaterThan(0);
  });

  it('rejects non-integer page: 1.5', async () => {
    const dto = plainToInstance(PaginationDto, { page: 1.5 });
    const errors = await validate(dto);
    const pageErrors = errors.filter((e) => e.property === 'page');
    expect(pageErrors.length).toBeGreaterThan(0);
  });
});
