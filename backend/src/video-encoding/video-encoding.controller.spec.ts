import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeviceRevocationService } from '../auth/device-revocation.service';
import { Test } from '@nestjs/testing';
import { VideoEncodingController } from './video-encoding.controller';
import { VideoEncodingService } from './video-encoding.service';
import { AppConfigService } from '../config';
import { UserRole } from '../auth/decorators/roles.decorator';

// ---- helpers ----------------------------------------------------------------

const OWNER_ID = 'user-owner';
const OTHER_ID = 'user-other';
const ADMIN_ID = 'user-admin';
const LESSON_ID = 'lesson-1';
const JOB_ID = 'job-1';
const COURSE_ID = 'course-1';

type VideoServiceMock = {
  getLessonWithCourse: jest.Mock;
  getEncodingJobByJobId: jest.Mock;
  getLessonEncodingInfo: jest.Mock;
  getAllVideoLessonsDebugInfo: jest.Mock;
  getJobStatus: jest.Mock;
  createVideo: jest.Mock;
  handleJobCompletion: jest.Mock;
};

function makeFakeLesson(instructorId: string) {
  return {
    lessonId: LESSON_ID,
    title: 'Test Lesson',
    status: 'PUBLISHED',
    type: 'VIDEO',
    section: {
      course: {
        courseId: COURSE_ID,
        instructorId,
      },
    },
  };
}

const NO_ENCODING_INFO = {
  encodingJob: null,
  bunnyStreamStatus: null,
  diagnosis: 'No encoding job found - video may not have been uploaded',
};

/**
 * Built through the Nest testing module rather than `new Controller(...)`.
 *
 * Constructing directly would require asserting these mocks to
 * `VideoEncodingService` and `AppConfigService`, which is impossible without a
 * double cast — both classes have private members, so a structural stub is not
 * assignable to them. `useValue` takes the mock at the framework boundary, so
 * the mocks stay fully typed here and nothing is forced.
 */
async function buildMocks(): Promise<{
  controller: VideoEncodingController;
  mockService: VideoServiceMock;
}> {
  const mockService: VideoServiceMock = {
    getLessonWithCourse: jest.fn(),
    getEncodingJobByJobId: jest.fn(),
    getLessonEncodingInfo: jest.fn().mockResolvedValue(NO_ENCODING_INFO),
    getAllVideoLessonsDebugInfo: jest.fn(),
    getJobStatus: jest.fn(),
    createVideo: jest.fn(),
    handleJobCompletion: jest.fn(),
  };

  // The methods under test never read config; an empty stub is honest here.
  const mockConfig: Record<string, never> = {};

  const moduleRef = await Test.createTestingModule({
    controllers: [VideoEncodingController],
    providers: [
      { provide: DeviceRevocationService, useValue: { isRevoked: async () => false, forget: () => undefined } },
      
      { provide: VideoEncodingService, useValue: mockService },
      { provide: AppConfigService, useValue: mockConfig },
    ],
  }).compile();

  return {
    controller: moduleRef.get(VideoEncodingController),
    mockService,
  };
}

// ---- tests ------------------------------------------------------------------

describe('VideoEncodingController › loadLessonForUser (via debugLesson)', () => {
  let controller: VideoEncodingController;
  let mockService: VideoServiceMock;

  beforeEach(async () => {
    ({ controller, mockService } = await buildMocks());
  });

  it('allows an instructor who owns the course', async () => {
    mockService.getLessonWithCourse.mockResolvedValue(makeFakeLesson(OWNER_ID));

    const result = await controller.debugLesson(LESSON_ID, {
      userId: OWNER_ID,
      role: UserRole.INSTRUCTOR,
    });

    expect(result).toBeDefined();
    expect(result.lessonId).toBe(LESSON_ID);
  });

  it('throws ForbiddenException when an instructor does NOT own the course', async () => {
    // Lesson belongs to OWNER_ID, but caller is OTHER_ID
    mockService.getLessonWithCourse.mockResolvedValue(makeFakeLesson(OWNER_ID));

    await expect(
      controller.debugLesson(LESSON_ID, { userId: OTHER_ID, role: UserRole.INSTRUCTOR }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when the lesson does not exist', async () => {
    mockService.getLessonWithCourse.mockResolvedValue(null);

    await expect(
      controller.debugLesson(LESSON_ID, { userId: OWNER_ID, role: UserRole.INSTRUCTOR }),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows a PLATFORM_ADMIN regardless of course ownership', async () => {
    // Lesson belongs to OWNER_ID, caller is ADMIN_ID with PLATFORM_ADMIN role
    mockService.getLessonWithCourse.mockResolvedValue(makeFakeLesson(OWNER_ID));

    const result = await controller.debugLesson(LESSON_ID, {
      userId: ADMIN_ID,
      role: UserRole.PLATFORM_ADMIN,
    });

    expect(result).toBeDefined();
  });
});

describe('VideoEncodingController › getJobStatus', () => {
  let controller: VideoEncodingController;
  let mockService: VideoServiceMock;

  beforeEach(async () => {
    ({ controller, mockService } = await buildMocks());
  });

  it('throws NotFoundException for an unknown job id and never calls the encoding service', async () => {
    // getEncodingJobByJobId returns null → job not found
    mockService.getEncodingJobByJobId.mockResolvedValue(null);

    await expect(
      controller.getJobStatus(JOB_ID, { userId: OWNER_ID, role: UserRole.INSTRUCTOR }),
    ).rejects.toThrow(NotFoundException);

    expect(mockService.getJobStatus).not.toHaveBeenCalled();
  });

  it('authorises before calling the encoding service — ForbiddenException, service not called', async () => {
    const fakeJob = { jobId: JOB_ID, lessonId: LESSON_ID, courseId: COURSE_ID };

    // Job found; lesson belongs to OWNER_ID, but caller is OTHER_ID
    mockService.getEncodingJobByJobId.mockResolvedValue(fakeJob);
    mockService.getLessonWithCourse.mockResolvedValue(makeFakeLesson(OWNER_ID));

    await expect(
      controller.getJobStatus(JOB_ID, { userId: OTHER_ID, role: UserRole.INSTRUCTOR }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockService.getJobStatus).not.toHaveBeenCalled();
  });
});
