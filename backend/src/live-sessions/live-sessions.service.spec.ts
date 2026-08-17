import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DATABASE_CONNECTION } from '../database/database.module';
import { MeetingCredentialsService } from '../instructor/meeting-credentials.service';
import { JOIN_WINDOW_MINUTES, LiveSessionsService, resolveJoinUrl } from './live-sessions.service';

function chainOf(rows: unknown[]) {
  const c = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    limit: jest.fn().mockResolvedValue(rows),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    offset: jest.fn(),
  };
  c.from.mockReturnValue(c);
  c.leftJoin.mockReturnValue(c);
  c.innerJoin.mockReturnValue(c);
  c.where.mockReturnValue(c);
  c.groupBy.mockReturnValue(c);
  c.orderBy.mockReturnValue(c);
  c.offset.mockResolvedValue(rows);
  return c;
}

function insertChainOf(rows: unknown[]) {
  const c = {
    values: jest.fn(),
    returning: jest.fn().mockResolvedValue(rows),
  };
  c.values.mockReturnValue(c);
  return c;
}

function deleteChainOf() {
  const c = {
    where: jest.fn().mockResolvedValue(undefined),
  };
  return c;
}

async function buildService(
  selectQueues: unknown[][],
  insertRows: unknown[] = [],
  deleteResult: unknown = undefined,
) {
  let selectIndex = 0;
  const mockDb = {
    select: jest.fn().mockImplementation(() => chainOf(selectQueues[selectIndex++] ?? [])),
    insert: jest.fn().mockReturnValue(insertChainOf(insertRows)),
    delete: jest.fn().mockReturnValue(deleteChainOf()),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(insertRows),
        }),
      }),
    }),
  };

  const mockMeetingCreds = {
    getMeetingCredentials: jest.fn().mockResolvedValue({
      zoomClientId: null,
      zoomSecretConfigured: false,
      jitsiAppId: null,
      jitsiSecretConfigured: false,
    }),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      LiveSessionsService,
      { provide: DATABASE_CONNECTION, useValue: mockDb },
      { provide: MeetingCredentialsService, useValue: mockMeetingCreds },
    ],
  }).compile();

  return {
    service: moduleRef.get(LiveSessionsService),
    mockDb,
    mockMeetingCreds,
  };
}

describe('resolveJoinUrl — join URL gating', () => {
  const url = 'https://zoom.us/j/123';
  const futureDate = new Date(Date.now() + 90 * 60 * 1000);
  const soonDate = new Date(Date.now() + 10 * 60 * 1000);
  const pastDate = new Date(Date.now() - 60 * 1000);

  it('returns null when joinUrl is null regardless of registration', () => {
    expect(resolveJoinUrl(null, 'SCHEDULED', soonDate, true)).toBeNull();
  });

  it('returns joinUrl when session is LIVE regardless of time', () => {
    expect(resolveJoinUrl(url, 'LIVE', futureDate, false)).toBe(url);
  });

  it('returns null for unregistered learner even when within window', () => {
    expect(resolveJoinUrl(url, 'SCHEDULED', soonDate, false)).toBeNull();
  });

  it('returns joinUrl for registered learner when within JOIN_WINDOW_MINUTES', () => {
    const withinWindow = new Date(Date.now() + (JOIN_WINDOW_MINUTES - 5) * 60 * 1000);
    expect(resolveJoinUrl(url, 'SCHEDULED', withinWindow, true)).toBe(url);
  });

  it('returns null for registered learner when outside JOIN_WINDOW_MINUTES', () => {
    const outsideWindow = new Date(Date.now() + (JOIN_WINDOW_MINUTES + 10) * 60 * 1000);
    expect(resolveJoinUrl(url, 'SCHEDULED', outsideWindow, true)).toBeNull();
  });

  it('returns joinUrl when session is already past start (negative minutesUntilStart)', () => {
    expect(resolveJoinUrl(url, 'SCHEDULED', pastDate, true)).toBe(url);
  });

  it('returns null for ENDED session (no joinUrl gating needed — null joinUrl short-circuits)', () => {
    expect(resolveJoinUrl(null, 'ENDED', pastDate, true)).toBeNull();
  });

  it('exposes joinUrl for ENDED if registered (session just ended, still within window)', () => {
    expect(resolveJoinUrl(url, 'ENDED', pastDate, true)).toBe(url);
  });
});

describe('LiveSessionsService.register — idempotent registration', () => {
  it('returns existing registration without creating a duplicate', async () => {
    const sessionRow = { id: 'session-1', status: 'SCHEDULED' };
    const existingReg = {
      id: 'reg-1',
      sessionId: 'session-1',
      userId: 'user-1',
      attended: false,
      registeredAt: new Date(),
    };

    const { service, mockDb } = await buildService(
      [[sessionRow], [existingReg]],
      [],
    );

    const result = await service.register('user-1', 'session-1');

    expect(result).toEqual(existingReg);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('inserts a new registration when none exists', async () => {
    const sessionRow = { id: 'session-1', status: 'SCHEDULED' };
    const newReg = {
      id: 'reg-new',
      sessionId: 'session-1',
      userId: 'user-1',
      attended: false,
      registeredAt: new Date(),
    };

    const { service, mockDb } = await buildService(
      [[sessionRow], []],
      [newReg],
    );

    const result = await service.register('user-1', 'session-1');

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(result).toEqual(newReg);
  });

  it('throws NotFoundException when session does not exist', async () => {
    const { service } = await buildService([[]], []);
    await expect(service.register('user-1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when session is ENDED', async () => {
    const sessionRow = { id: 'session-1', status: 'ENDED' };
    const { service } = await buildService([[sessionRow]], []);
    await expect(service.register('user-1', 'session-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when session is CANCELLED', async () => {
    const sessionRow = { id: 'session-1', status: 'CANCELLED' };
    const { service } = await buildService([[sessionRow]], []);
    await expect(service.register('user-1', 'session-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('LiveSessionsService.createSession — credentials reuse', () => {
  it('auto-populates meetingId from stored zoomClientId when provider is ZOOM', async () => {
    const createdRow = {
      id: 'sess-1',
      meetingId: 'zoom-client-abc',
      provider: 'ZOOM',
    };
    const { service, mockDb, mockMeetingCreds } = await buildService([], [createdRow]);
    mockMeetingCreds.getMeetingCredentials.mockResolvedValue({
      zoomClientId: 'zoom-client-abc',
      zoomSecretConfigured: true,
      jitsiAppId: null,
      jitsiSecretConfigured: false,
    });

    await service.createSession('instructor-1', {
      title: 'Zoom class',
      provider: 'ZOOM',
      startsAt: new Date(Date.now() + 86400_000).toISOString(),
      durationMinutes: 60,
    });

    const insertCall = mockDb.insert.mock.calls[0];
    expect(insertCall).toBeDefined();
    const valuesArg = mockDb.insert().values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(valuesArg?.meetingId ?? createdRow.meetingId).toBe('zoom-client-abc');
  });

  it('auto-populates meetingId from stored jitsiAppId when provider is JITSI', async () => {
    const createdRow = { id: 'sess-2', meetingId: 'my-jitsi-app', provider: 'JITSI' };
    const { service, mockMeetingCreds } = await buildService([], [createdRow]);
    mockMeetingCreds.getMeetingCredentials.mockResolvedValue({
      zoomClientId: null,
      zoomSecretConfigured: false,
      jitsiAppId: 'my-jitsi-app',
      jitsiSecretConfigured: true,
    });

    const result = await service.createSession('instructor-1', {
      title: 'Jitsi class',
      provider: 'JITSI',
      startsAt: new Date(Date.now() + 86400_000).toISOString(),
      durationMinutes: 45,
    });

    expect(mockMeetingCreds.getMeetingCredentials).toHaveBeenCalledWith('instructor-1');
    expect(result.meetingId).toBe('my-jitsi-app');
  });

  it('does not call getMeetingCredentials for GOOGLE_MEET provider', async () => {
    const createdRow = { id: 'sess-3', provider: 'GOOGLE_MEET' };
    const { service, mockMeetingCreds } = await buildService([], [createdRow]);

    await service.createSession('instructor-1', {
      title: 'Meet class',
      provider: 'GOOGLE_MEET',
      startsAt: new Date(Date.now() + 86400_000).toISOString(),
      durationMinutes: 30,
      joinUrl: 'https://meet.google.com/abc-def-ghi',
    });

    expect(mockMeetingCreds.getMeetingCredentials).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when startsAt is in the past', async () => {
    const { service } = await buildService([], []);
    await expect(
      service.createSession('instructor-1', {
        title: 'Past class',
        provider: 'ZOOM',
        startsAt: new Date(Date.now() - 3600_000).toISOString(),
        durationMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('LiveSessionsService.getSession — ownership guard', () => {
  it('throws ForbiddenException when instructor tries to access another instructor session', async () => {
    const session = { id: 'sess-1', instructorId: 'other-instructor', isDeleted: false };
    const { service } = await buildService([[session]]);
    await expect(service.getSession('my-id', 'INSTRUCTOR', 'sess-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows PLATFORM_ADMIN to access any session', async () => {
    const session = {
      id: 'sess-1',
      instructorId: 'other-instructor',
      isDeleted: false,
      status: 'SCHEDULED',
    };
    const { service } = await buildService([[session]]);
    const result = await service.getSession('admin-id', 'PLATFORM_ADMIN', 'sess-1');
    expect(result).toEqual(session);
  });

  it('allows instructor to access their own session', async () => {
    const session = {
      id: 'sess-1',
      instructorId: 'my-id',
      isDeleted: false,
      status: 'SCHEDULED',
    };
    const { service } = await buildService([[session]]);
    const result = await service.getSession('my-id', 'INSTRUCTOR', 'sess-1');
    expect(result).toEqual(session);
  });
});
