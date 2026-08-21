import { NotFoundException } from '@nestjs/common';
import { AccountSuspensionService } from '../auth/account-suspension.service';
import { DeviceRevocationService } from '../auth/device-revocation.service';
import { Test } from '@nestjs/testing';

import { DATABASE_CONNECTION } from '../database/database.module';
import { UsersService } from './users.service';
import { EmailService } from '../email/email.service';
import { FilesService } from '../files/files.service';
import { AuditLogService } from '../audit/audit-log.service';

const emailServiceMock = { sendRoleChangeEmail: jest.fn() };
const auditLogServiceMock = { record: jest.fn().mockResolvedValue(undefined) };
const filesServiceMock = {
  getDownloadUrl: jest.fn((k: string) => `https://cdn.example.com/${k}`),
  extractKey: jest.fn((v: string) => v),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

async function buildService(db: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      { provide: DeviceRevocationService, useValue: { isRevoked: async () => false, forget: () => undefined } },
      { provide: AccountSuspensionService, useValue: { isSuspended: async () => false, forget: () => undefined } },
      
      UsersService,
      { provide: DATABASE_CONNECTION, useValue: db },
      { provide: EmailService, useValue: emailServiceMock },
      { provide: FilesService, useValue: filesServiceMock },
      { provide: AuditLogService, useValue: auditLogServiceMock },
    ],
  }).compile();

  return moduleRef.get(UsersService);
}

describe('UsersService › profile location/social round-trip', () => {
  it('saves location and social via updateMe and returns them from getMe', async () => {
    const stored: Record<string, unknown> = {
      userId: 'user-1',
      email: 'a@b.com',
      firstName: 'Alice',
      lastName: 'Smith',
      role: 'LEARNER',
      profileImage: null,
      emailVerified: true,
      headline: null,
      bio: null,
      phone: null,
      addressLine: null,
      city: null,
      state: null,
      country: null,
      postalCode: null,
      social: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dbMock = {
      select: jest.fn().mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockImplementation(() => {
                return Promise.resolve([{ ...stored }]);
              }),
            }),
          }),
        };
      }),
      update: jest.fn().mockImplementation(() => ({
        set: jest.fn().mockImplementation((updates: Record<string, unknown>) => {
          Object.assign(stored, updates);
          return {
            where: jest.fn().mockResolvedValue([]),
          };
        }),
      })),
    };

    const service = await buildService(dbMock);

    await service.updateMe('user-1', {
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411038',
      social: { website: 'https://alice.dev', linkedin: '', twitter: '', github: '' },
    });

    const profile = await service.getMe('user-1');

    expect(profile.city).toBe('Pune');
    expect(profile.state).toBe('Maharashtra');
    expect(profile.country).toBe('India');
    expect(profile.postalCode).toBe('411038');
    expect(profile.social).toMatchObject({ website: 'https://alice.dev' });
  });
});

describe('UsersService › revokeDevice — 404 for another user\'s device', () => {
  it('throws NotFoundException when the device belongs to a different user', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { deviceId: 'device-1', userId: 'other-user' },
            ]),
          }),
        }),
      }),
      update: jest.fn(),
    };

    const service = await buildService(dbMock);

    await expect(service.revokeDevice('requesting-user', 'device-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when the device does not exist', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: jest.fn(),
    };

    const service = await buildService(dbMock);

    await expect(service.revokeDevice('requesting-user', 'nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('UsersService › revokeOtherDevices — returns correct count', () => {
  it('returns the number of devices revoked', async () => {
    const activeDevices = [
      { deviceId: 'dev-a' },
      { deviceId: 'dev-b' },
      { deviceId: 'dev-c' },
    ];

    const dbMock = {
      select: jest.fn().mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(activeDevices),
          }),
        };
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    };

    const service = await buildService(dbMock);

    const result = await service.revokeOtherDevices('user-1', 'dev-current');

    expect(result.removed).toBe(3);
    expect(dbMock.delete).toHaveBeenCalled();
    expect(result.message).toMatch(/signed out/i);
  });

  it('returns removed: 0 when no other devices are active', async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
      update: jest.fn(),
    };

    const service = await buildService(dbMock);

    const result = await service.revokeOtherDevices('user-1', 'dev-current');

    expect(result.removed).toBe(0);
  });
});
