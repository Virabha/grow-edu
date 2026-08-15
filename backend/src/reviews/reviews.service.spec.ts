import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { FilesService } from '../files/files.service';

function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: jest.fn(),
    where: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    orderBy: jest.fn(),
    offset: jest.fn(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  return chain;
}

function makeSelectChainNoLimit(rows: unknown[]) {
  const chain = {
    from: jest.fn(),
    where: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    orderBy: jest.fn().mockResolvedValue(rows),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  return chain;
}

function makeUpdateChain(rows: unknown[]) {
  const chain = {
    set: jest.fn(),
    where: jest.fn(),
    returning: jest.fn().mockResolvedValue(rows),
  };
  chain.set.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

describe('ReviewsService', () => {
  let service: ReviewsService;

  const dbMock = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };

  const filesMock = {
    getDownloadUrl: jest.fn().mockReturnValue('https://cdn.example.com/img.jpg'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
        { provide: FilesService, useValue: filesMock },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('createReview — enrollment gate', () => {
    it('throws ForbiddenException when the caller is not enrolled', async () => {
      dbMock.select.mockReturnValue(makeSelectChain([]));

      await expect(
        service.createReview('user-1', {
          courseId: 'course-1',
          rating: 5,
          body: 'Excellent course.',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('createReview — duplicate review revival', () => {
    it('revives a soft-deleted row rather than failing on the unique index', async () => {
      const enrollmentRow = [{ enrollmentId: 'enr-1' }];
      const deletedReviewRow = [{ reviewId: 'rev-1', isDeleted: true }];

      dbMock.select
        .mockReturnValueOnce(makeSelectChain(enrollmentRow))
        .mockReturnValueOnce(makeSelectChain(deletedReviewRow));

      const revivedRow = {
        reviewId: 'rev-1',
        status: 'PENDING',
        isDeleted: false,
        rating: 4,
        body: 'Updated body.',
      };
      dbMock.update.mockReturnValue(makeUpdateChain([revivedRow]));

      const result = await service.createReview('user-1', {
        courseId: 'course-1',
        rating: 4,
        body: 'Updated body.',
      });

      expect(result).toEqual(revivedRow);
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('throws ConflictException when an active review already exists', async () => {
      const enrollmentRow = [{ enrollmentId: 'enr-1' }];
      const activeReviewRow = [{ reviewId: 'rev-1', isDeleted: false }];

      dbMock.select
        .mockReturnValueOnce(makeSelectChain(enrollmentRow))
        .mockReturnValueOnce(makeSelectChain(activeReviewRow));

      await expect(
        service.createReview('user-1', {
          courseId: 'course-1',
          rating: 5,
          body: 'Great.',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('moderateReview — moderation transition', () => {
    it('sets status, moderatedBy, and moderatedAt when publishing', async () => {
      dbMock.select.mockReturnValue(
        makeSelectChain([{ reviewId: 'rev-1', isDeleted: false }]),
      );

      const publishedRow = {
        reviewId: 'rev-1',
        status: 'PUBLISHED',
        moderatedBy: 'admin-1',
      };
      const updateChain = makeUpdateChain([publishedRow]);
      dbMock.update.mockReturnValue(updateChain);

      const result = await service.moderateReview('rev-1', 'admin-1', 'PUBLISHED');

      expect(result).toEqual(publishedRow);

      const setPayload = updateChain.set.mock.calls[0][0] as {
        status: string;
        moderatedBy: string;
        moderatedAt: Date;
      };
      expect(setPayload.status).toBe('PUBLISHED');
      expect(setPayload.moderatedBy).toBe('admin-1');
      expect(setPayload.moderatedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException for a non-existent review', async () => {
      dbMock.select.mockReturnValue(makeSelectChain([]));

      await expect(
        service.moderateReview('missing', 'admin-1', 'REJECTED'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getReviewableCourses — already-reviewed exclusion', () => {
    it('returns an empty array when the DB reports all enrolled courses have been reviewed', async () => {
      dbMock.select.mockReturnValue(makeSelectChainNoLimit([]));

      const result = await service.getReviewableCourses('user-1');

      expect(result).toEqual([]);
    });

    it('returns courses with correct shape when unreviewed courses exist', async () => {
      const dbRow = {
        courseId: 'course-1',
        title: 'TypeScript Mastery',
        thumbnail: null,
        progressPercent: 45,
      };
      dbMock.select.mockReturnValue(makeSelectChainNoLimit([dbRow]));

      const result = await service.getReviewableCourses('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        courseId: 'course-1',
        title: 'TypeScript Mastery',
        thumbnail: '',
        progressPercent: 45,
      });
    });
  });

  describe('addInstructorReply — ownership check', () => {
    it('throws ForbiddenException when the caller is not the course instructor', async () => {
      dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            reviewId: 'rev-1',
            isDeleted: false,
            courseInstructorId: 'real-instructor',
          },
        ]),
      );

      await expect(
        service.addInstructorReply('rev-1', 'different-instructor', 'Nice!'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the updated review when the caller owns the course', async () => {
      dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            reviewId: 'rev-1',
            isDeleted: false,
            courseInstructorId: 'instructor-1',
          },
        ]),
      );

      const updatedRow = {
        reviewId: 'rev-1',
        instructorReply: 'Thank you!',
      };
      dbMock.update.mockReturnValue(makeUpdateChain([updatedRow]));

      const result = await service.addInstructorReply(
        'rev-1',
        'instructor-1',
        'Thank you!',
      );

      expect(result).toEqual(updatedRow);
    });
  });
});
