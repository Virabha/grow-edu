import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountSuspensionService } from '../auth/account-suspension.service';
import { DeviceRevocationService } from '../auth/device-revocation.service';
import { Test } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { UserRole } from '../auth/decorators/roles.decorator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COURSE_ID = 'course-abc';
const OWNER_ID = 'instructor-owner';
const OTHER_ID = 'instructor-other';
const ADMIN_ID = 'admin-user';
const STUDENT_ID = 'student-enrolled';
const NON_STUDENT_ID = 'student-not-enrolled';
const ANNOUNCEMENT_ID = 'ann-1';

const FAKE_ANNOUNCEMENT = {
  announcementId: ANNOUNCEMENT_ID,
  courseId: COURSE_ID,
  instructorId: OWNER_ID,
  title: 'Test',
  body: 'Body',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mock helpers ───────────────────────────────────────────────────────────────

type ServiceMock = {
  create: jest.Mock;
  listByCourse: jest.Mock;
  listMine: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

async function buildController(): Promise<{
  controller: AnnouncementsController;
  svc: ServiceMock;
}> {
  const svc: ServiceMock = {
    create: jest.fn(),
    listByCourse: jest.fn(),
    listMine: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [AnnouncementsController],
    providers: [
      { provide: DeviceRevocationService, useValue: { isRevoked: async () => false, forget: () => undefined } },
      { provide: AccountSuspensionService, useValue: { isSuspended: async () => false, forget: () => undefined } },
      { provide: AnnouncementsService, useValue: svc }],
  }).compile();

  return {
    controller: moduleRef.get(AnnouncementsController),
    svc,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AnnouncementsController › create', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('owner can post — delegates to service and returns created announcement', async () => {
    svc.create.mockResolvedValue(FAKE_ANNOUNCEMENT);

    const result = await controller.create(
      COURSE_ID,
      { title: 'Test', body: 'Body' },
      { userId: OWNER_ID, role: UserRole.INSTRUCTOR },
    );

    expect(svc.create).toHaveBeenCalledWith(
      COURSE_ID,
      { title: 'Test', body: 'Body' },
      { userId: OWNER_ID, role: UserRole.INSTRUCTOR },
    );
    expect(result).toEqual(FAKE_ANNOUNCEMENT);
  });

  it('non-owner instructor gets NotFoundException (service throws it)', async () => {
    svc.create.mockRejectedValue(new NotFoundException('Course not found'));

    await expect(
      controller.create(
        COURSE_ID,
        { title: 'Test', body: 'Body' },
        { userId: OTHER_ID, role: UserRole.INSTRUCTOR },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('admin can post regardless of course ownership', async () => {
    svc.create.mockResolvedValue(FAKE_ANNOUNCEMENT);

    const result = await controller.create(
      COURSE_ID,
      { title: 'Test', body: 'Body' },
      { userId: ADMIN_ID, role: UserRole.PLATFORM_ADMIN },
    );

    expect(result).toEqual(FAKE_ANNOUNCEMENT);
  });
});

describe('AnnouncementsController › listByCourse (read access)', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('enrolled student can read — service returns list', async () => {
    svc.listByCourse.mockResolvedValue([FAKE_ANNOUNCEMENT]);

    const result = await controller.listByCourse(COURSE_ID, {
      userId: STUDENT_ID,
      role: UserRole.LEARNER,
    });

    expect(result).toEqual([FAKE_ANNOUNCEMENT]);
  });

  it('non-enrolled student gets ForbiddenException (service throws it)', async () => {
    svc.listByCourse.mockRejectedValue(
      new ForbiddenException('Not enrolled in this course'),
    );

    await expect(
      controller.listByCourse(COURSE_ID, {
        userId: NON_STUDENT_ID,
        role: UserRole.LEARNER,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('course owner can always read', async () => {
    svc.listByCourse.mockResolvedValue([FAKE_ANNOUNCEMENT]);

    const result = await controller.listByCourse(COURSE_ID, {
      userId: OWNER_ID,
      role: UserRole.INSTRUCTOR,
    });

    expect(result).toEqual([FAKE_ANNOUNCEMENT]);
  });

  it('non-owner instructor gets NotFoundException', async () => {
    svc.listByCourse.mockRejectedValue(new NotFoundException('Course not found'));

    await expect(
      controller.listByCourse(COURSE_ID, {
        userId: OTHER_ID,
        role: UserRole.INSTRUCTOR,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AnnouncementsController › update', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('author can update', async () => {
    svc.update.mockResolvedValue({ ...FAKE_ANNOUNCEMENT, title: 'Updated' });

    const result = await controller.update(
      ANNOUNCEMENT_ID,
      { title: 'Updated' },
      { userId: OWNER_ID, role: UserRole.INSTRUCTOR },
    );

    expect(result.title).toBe('Updated');
  });

  it('non-author gets NotFoundException', async () => {
    svc.update.mockRejectedValue(new NotFoundException('Announcement not found'));

    await expect(
      controller.update(
        ANNOUNCEMENT_ID,
        { title: 'Hack' },
        { userId: OTHER_ID, role: UserRole.INSTRUCTOR },
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AnnouncementsController › remove', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('author can delete', async () => {
    svc.remove.mockResolvedValue({ success: true });

    const result = await controller.remove(ANNOUNCEMENT_ID, {
      userId: OWNER_ID,
      role: UserRole.INSTRUCTOR,
    });

    expect(result.success).toBe(true);
  });

  it('non-author gets NotFoundException', async () => {
    svc.remove.mockRejectedValue(new NotFoundException('Announcement not found'));

    await expect(
      controller.remove(ANNOUNCEMENT_ID, {
        userId: OTHER_ID,
        role: UserRole.INSTRUCTOR,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
