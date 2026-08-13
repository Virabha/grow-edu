import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCourseDto } from './create-course.dto';
import { UpdateCourseDto } from './update-course.dto';

// Minimal valid body for CreateCourseDto
const VALID_CREATE = {
  title: 'Test Course',
  slug: 'test-course',
  description: 'A sufficiently long description',
  price: 100,
  categoryId: 'cat-1',
};

describe('CreateCourseDto › money field validation', () => {
  it('rejects a negative price', async () => {
    const dto = plainToInstance(CreateCourseDto, { ...VALID_CREATE, price: -1 });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'price');
    expect(priceErrors.length).toBeGreaterThan(0);
  });

  it('accepts price = 0 (free course)', async () => {
    const dto = plainToInstance(CreateCourseDto, { ...VALID_CREATE, price: 0 });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'price');
    expect(priceErrors).toHaveLength(0);
  });

  it('rejects a negative compareAtPrice', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...VALID_CREATE,
      compareAtPrice: -50,
    });
    const errors = await validate(dto);
    const compareErrors = errors.filter((e) => e.property === 'compareAtPrice');
    expect(compareErrors.length).toBeGreaterThan(0);
  });

  it('accepts compareAtPrice = 0', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...VALID_CREATE,
      compareAtPrice: 0,
    });
    const errors = await validate(dto);
    const compareErrors = errors.filter((e) => e.property === 'compareAtPrice');
    expect(compareErrors).toHaveLength(0);
  });
});

describe('UpdateCourseDto › money field validation', () => {
  it('rejects a negative price', async () => {
    const dto = plainToInstance(UpdateCourseDto, { price: -5 });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'price');
    expect(priceErrors.length).toBeGreaterThan(0);
  });

  it('accepts price = 0', async () => {
    const dto = plainToInstance(UpdateCourseDto, { price: 0 });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'price');
    expect(priceErrors).toHaveLength(0);
  });

  it('rejects a negative compareAtPrice', async () => {
    const dto = plainToInstance(UpdateCourseDto, { compareAtPrice: -10 });
    const errors = await validate(dto);
    const compareErrors = errors.filter((e) => e.property === 'compareAtPrice');
    expect(compareErrors.length).toBeGreaterThan(0);
  });

  it('accepts compareAtPrice = 0', async () => {
    const dto = plainToInstance(UpdateCourseDto, { compareAtPrice: 0 });
    const errors = await validate(dto);
    const compareErrors = errors.filter((e) => e.property === 'compareAtPrice');
    expect(compareErrors).toHaveLength(0);
  });
});
