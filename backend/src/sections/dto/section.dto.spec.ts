import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSectionDto } from './section.dto';

const VALID_SECTION = {
  courseId: 'course-1',
  title: 'Section One',
  order: 1,
};

describe('CreateSectionDto › sectionPrice validation (@Min(0))', () => {
  it('rejects a negative sectionPrice', async () => {
    const dto = plainToInstance(CreateSectionDto, {
      ...VALID_SECTION,
      sectionPrice: -10,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'sectionPrice');
    expect(priceErrors.length).toBeGreaterThan(0);
  });

  it('accepts sectionPrice = 0 (free section)', async () => {
    const dto = plainToInstance(CreateSectionDto, {
      ...VALID_SECTION,
      sectionPrice: 0,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'sectionPrice');
    expect(priceErrors).toHaveLength(0);
  });

  it('accepts a positive sectionPrice', async () => {
    const dto = plainToInstance(CreateSectionDto, {
      ...VALID_SECTION,
      sectionPrice: 99,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'sectionPrice');
    expect(priceErrors).toHaveLength(0);
  });
});
