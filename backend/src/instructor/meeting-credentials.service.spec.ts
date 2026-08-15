import { Test } from '@nestjs/testing';
import { MeetingCredentialsService } from './meeting-credentials.service';
import { DATABASE_CONNECTION } from '../database/database.module';

function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  const chain = {
    values: jest.fn(),
    onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
  };
  chain.values.mockReturnValue(chain);
  return chain;
}

function makeUpdateChain() {
  const chain = {
    set: jest.fn(),
    where: jest.fn().mockResolvedValue(undefined),
  };
  chain.set.mockReturnValue(chain);
  return chain;
}

async function buildService(mockDb: Record<string, jest.Mock>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      MeetingCredentialsService,
      { provide: DATABASE_CONNECTION, useValue: mockDb },
    ],
  }).compile();
  return moduleRef.get(MeetingCredentialsService);
}

describe('MeetingCredentialsService', () => {
  describe('getMeetingCredentials — secret never returned', () => {
    it('returns safe shape with secretConfigured=true when secret exists in DB', async () => {
      const selectChain = makeSelectChain([{
        zoomClientId: 'client-abc',
        zoomClientSecret: 'super-secret-DO-NOT-RETURN',
        jitsiAppId: null,
        jitsiSecret: null,
      }]);
      const mockDb = { select: jest.fn().mockReturnValue(selectChain) };
      const service = await buildService(mockDb);

      const result = await service.getMeetingCredentials('user-1');

      expect(result).not.toHaveProperty('zoomClientSecret');
      expect(result).not.toHaveProperty('jitsiSecret');
      expect(result).not.toHaveProperty('zoomHasSecret');
      expect(result).not.toHaveProperty('jitsiHasSecret');
      expect(result.zoomSecretConfigured).toBe(true);
      expect(result.jitsiSecretConfigured).toBe(false);
      expect(result.zoomClientId).toBe('client-abc');
    });

    it('returns all-null safe shape when no row exists', async () => {
      const selectChain = makeSelectChain([]);
      const mockDb = { select: jest.fn().mockReturnValue(selectChain) };
      const service = await buildService(mockDb);

      const result = await service.getMeetingCredentials('user-none');

      expect(result).toStrictEqual({
        zoomClientId: null,
        zoomSecretConfigured: false,
        jitsiAppId: null,
        jitsiSecretConfigured: false,
      });
    });

    it('queries DB exactly once using the caller userId', async () => {
      const selectChain = makeSelectChain([]);
      const mockDb = { select: jest.fn().mockReturnValue(selectChain) };
      const service = await buildService(mockDb);

      await service.getMeetingCredentials('caller-user');

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(selectChain.where).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertZoomCredentials — empty secret leaves stored secret unchanged', () => {
    it('with empty clientSecret, onConflictDoUpdate set does NOT include zoomClientSecret', async () => {
      const insertChain = makeInsertChain();
      const selectChain = makeSelectChain([]);
      const mockDb = {
        insert: jest.fn().mockReturnValue(insertChain),
        select: jest.fn().mockReturnValue(selectChain),
      };
      const service = await buildService(mockDb);

      await service.upsertZoomCredentials('user-1', { clientId: 'id-1', clientSecret: '' });

      expect(insertChain.onConflictDoUpdate).toHaveBeenCalledTimes(1);
      const [callArg] = insertChain.onConflictDoUpdate.mock.calls[0] as [{ set: Record<string, unknown> }];
      expect(callArg.set).not.toHaveProperty('zoomClientSecret');
    });

    it('with undefined clientSecret, onConflictDoUpdate set does NOT include zoomClientSecret', async () => {
      const insertChain = makeInsertChain();
      const selectChain = makeSelectChain([]);
      const mockDb = {
        insert: jest.fn().mockReturnValue(insertChain),
        select: jest.fn().mockReturnValue(selectChain),
      };
      const service = await buildService(mockDb);

      await service.upsertZoomCredentials('user-1', { clientId: 'id-1' });

      const [callArg] = insertChain.onConflictDoUpdate.mock.calls[0] as [{ set: Record<string, unknown> }];
      expect(callArg.set).not.toHaveProperty('zoomClientSecret');
    });

    it('with a non-empty clientSecret, onConflictDoUpdate set INCLUDES zoomClientSecret', async () => {
      const insertChain = makeInsertChain();
      const selectChain = makeSelectChain([]);
      const mockDb = {
        insert: jest.fn().mockReturnValue(insertChain),
        select: jest.fn().mockReturnValue(selectChain),
      };
      const service = await buildService(mockDb);

      await service.upsertZoomCredentials('user-1', { clientId: 'id-1', clientSecret: 'new-secret' });

      const [callArg] = insertChain.onConflictDoUpdate.mock.calls[0] as [{ set: Record<string, unknown> }];
      expect(callArg.set).toHaveProperty('zoomClientSecret', 'new-secret');
    });
  });

  describe('clearZoomCredentials — sets both fields to null', () => {
    it('calls db.update with zoomClientId: null and zoomClientSecret: null', async () => {
      const updateChain = makeUpdateChain();
      const selectChain = makeSelectChain([]);
      const mockDb = {
        update: jest.fn().mockReturnValue(updateChain),
        select: jest.fn().mockReturnValue(selectChain),
      };
      const service = await buildService(mockDb);

      await service.clearZoomCredentials('user-1');

      expect(updateChain.set).toHaveBeenCalledTimes(1);
      const [setArg] = updateChain.set.mock.calls[0] as [Record<string, unknown>];
      expect(setArg).toMatchObject({ zoomClientId: null, zoomClientSecret: null });
    });
  });

  describe('clearJitsiCredentials — sets both fields to null', () => {
    it('calls db.update with jitsiAppId: null and jitsiSecret: null', async () => {
      const updateChain = makeUpdateChain();
      const selectChain = makeSelectChain([]);
      const mockDb = {
        update: jest.fn().mockReturnValue(updateChain),
        select: jest.fn().mockReturnValue(selectChain),
      };
      const service = await buildService(mockDb);

      await service.clearJitsiCredentials('user-1');

      expect(updateChain.set).toHaveBeenCalledTimes(1);
      const [setArg] = updateChain.set.mock.calls[0] as [Record<string, unknown>];
      expect(setArg).toMatchObject({ jitsiAppId: null, jitsiSecret: null });
    });
  });

  describe('upsertJitsiCredentials — empty appKey leaves stored secret unchanged', () => {
    it('with empty appKey, onConflictDoUpdate set does NOT include jitsiSecret', async () => {
      const insertChain = makeInsertChain();
      const selectChain = makeSelectChain([]);
      const mockDb = {
        insert: jest.fn().mockReturnValue(insertChain),
        select: jest.fn().mockReturnValue(selectChain),
      };
      const service = await buildService(mockDb);

      await service.upsertJitsiCredentials('user-1', { appId: 'app-1', appKey: '' });

      expect(insertChain.onConflictDoUpdate).toHaveBeenCalledTimes(1);
      const [callArg] = insertChain.onConflictDoUpdate.mock.calls[0] as [{ set: Record<string, unknown> }];
      expect(callArg.set).not.toHaveProperty('jitsiSecret');
    });

    it('with a non-empty appKey, onConflictDoUpdate set INCLUDES jitsiSecret', async () => {
      const insertChain = makeInsertChain();
      const selectChain = makeSelectChain([]);
      const mockDb = {
        insert: jest.fn().mockReturnValue(insertChain),
        select: jest.fn().mockReturnValue(selectChain),
      };
      const service = await buildService(mockDb);

      await service.upsertJitsiCredentials('user-1', { appId: 'app-1', appKey: 'new-key' });

      const [callArg] = insertChain.onConflictDoUpdate.mock.calls[0] as [{ set: Record<string, unknown> }];
      expect(callArg.set).toHaveProperty('jitsiSecret', 'new-key');
    });
  });
});
