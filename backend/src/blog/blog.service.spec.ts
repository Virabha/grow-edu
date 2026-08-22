import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CLOCK } from '../common/clock';
import { JOB_QUEUE } from '../jobs/job-queue';
import { BlogService } from './blog.service';

type ChainBuilder = {
  from: (...a: unknown[]) => ChainBuilder;
  leftJoin: (...a: unknown[]) => ChainBuilder;
  where: (...a: unknown[]) => ChainBuilder;
  orderBy: (...a: unknown[]) => ChainBuilder;
  limit: (...a: unknown[]) => ChainBuilder;
  offset: (...a: unknown[]) => ChainBuilder;
  set: (...a: unknown[]) => ChainBuilder;
  values: (...a: unknown[]) => ChainBuilder;
  returning: () => Promise<unknown[]>;
  then: (
    ok?: ((v: unknown[]) => unknown) | null,
    err?: ((r: unknown) => unknown) | null,
  ) => Promise<unknown>;
};

function makeChain(rows: unknown[]): ChainBuilder {
  const b: ChainBuilder = {
    from: () => b,
    leftJoin: () => b,
    where: () => b,
    orderBy: () => b,
    limit: () => b,
    offset: () => b,
    set: () => b,
    values: () => b,
    returning: () => Promise.resolve(rows),
    then: (ok, fail) => Promise.resolve(rows).then(ok, fail),
  };
  return b;
}

const NOW = new Date('2026-01-01T00:00:00Z');

const fixedClock = {
  now: () => NOW,
  epochMillis: () => NOW.getTime(),
};

const silentQueue = {
  register: () => undefined,
  enqueue: () => Promise.resolve(),
  repeat: () => Promise.resolve(),
};

async function buildService(db: Record<string, jest.Mock>) {
  const mod = await Test.createTestingModule({
    providers: [
      BlogService,
      { provide: DATABASE_CONNECTION, useValue: db },
      { provide: CLOCK, useValue: fixedClock },
      { provide: JOB_QUEUE, useValue: silentQueue },
    ],
  }).compile();
  return mod.get(BlogService);
}

describe('BlogService › slug de-duplication', () => {
  it('auto-appends -2 when base slug already exists', async () => {
    let selectCount = 0;
    let capturedValues: Record<string, unknown> | undefined;

    const returning = jest.fn().mockResolvedValue([{ id: 'new-post', slug: 'hello-world-2' }]);
    const valuesFn = jest.fn().mockImplementation((v: Record<string, unknown>) => {
      capturedValues = v;
      return { returning };
    });

    const db = {
      select: jest.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeChain([{ id: 'other' }]);
        return makeChain([]);
      }),
      insert: jest.fn().mockReturnValue({ values: valuesFn }),
    };

    const service = await buildService(db);
    await service.createPost({ title: 'Hello World', content: 'Body' });

    expect(capturedValues?.slug).toBe('hello-world-2');
  });
});

describe('BlogService › publishedAt set-once', () => {
  it('sets publishedAt when post first goes PUBLISHED', async () => {
    const existing = {
      id: 'post-1',
      slug: 'my-post',
      publishedAt: null,
      isDeleted: false,
    };

    let selectCount = 0;
    const db = {
      select: jest.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeChain([existing]);
        return makeChain([]);
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ ...existing, status: 'PUBLISHED', publishedAt: NOW }]),
          }),
        }),
      }),
    };

    const service = await buildService(db);
    await service.updatePost('post-1', { status: 'PUBLISHED' });

    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setArg).toHaveProperty('publishedAt');
    expect(setArg.publishedAt).toBeInstanceOf(Date);
  });

  it('does NOT overwrite publishedAt on a second publish', async () => {
    const alreadyPublished = new Date('2025-06-01T00:00:00Z');
    const existing = {
      id: 'post-1',
      slug: 'my-post',
      publishedAt: alreadyPublished,
      isDeleted: false,
    };

    let selectCount = 0;
    const db = {
      select: jest.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeChain([existing]);
        return makeChain([]);
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([existing]),
          }),
        }),
      }),
    };

    const service = await buildService(db);
    await service.updatePost('post-1', { status: 'PUBLISHED' });

    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setArg).not.toHaveProperty('publishedAt');
  });
});

describe('BlogService › category delete with active posts', () => {
  it('throws ConflictException when the category still has posts', async () => {
    let selectCount = 0;
    const db = {
      select: jest.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return makeChain([{ id: 'cat-1', isDeleted: false }]);
        }
        return makeChain([{ postCount: 3 }]);
      }),
      update: jest.fn(),
    };

    const service = await buildService(db);
    await expect(service.deleteCategory('cat-1')).rejects.toThrow(ConflictException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('soft-deletes the category when no posts are linked', async () => {
    let selectCount = 0;
    const db = {
      select: jest.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeChain([{ id: 'cat-2', isDeleted: false }]);
        return makeChain([{ postCount: 0 }]);
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    const service = await buildService(db);
    const result = await service.deleteCategory('cat-2');
    expect(result).toMatchObject({ deleted: true, id: 'cat-2' });
    expect(db.update).toHaveBeenCalled();
  });
});

describe('BlogService › public list excludes non-PUBLISHED posts', () => {
  it('only returns PUBLISHED posts on the public endpoint', async () => {
    const publishedPost = {
      id: 'post-pub',
      title: 'Live Post',
      slug: 'live-post',
      status: 'PUBLISHED',
      publishedAt: NOW,
    };

    let selectCount = 0;
    const db = {
      select: jest.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeChain([publishedPost]);
        return makeChain([{ total: 1 }]);
      }),
    };

    const service = await buildService(db);
    const result = await service.listPublicPosts({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('post-pub');
    expect(result.pagination.total).toBe(1);
  });

  it('returns { data, pagination } matching ResourcePage contract', async () => {
    const db = {
      select: jest.fn()
        .mockImplementationOnce(() => makeChain([]))
        .mockImplementationOnce(() => makeChain([{ total: 0 }])),
    };

    const service = await buildService(db);
    const result = await service.listPublicPosts({ page: 2, limit: 10 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});

describe('BlogService › 404 handling', () => {
  it('throws NotFoundException for a missing category', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeChain([])),
    };
    const service = await buildService(db);
    await expect(service.getCategory('no-such-id')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException for a missing post', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeChain([])),
    };
    const service = await buildService(db);
    await expect(service.getPost('no-such-id')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException for a non-published post on the public endpoint', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeChain([])),
    };
    const service = await buildService(db);
    await expect(service.getPublicPostBySlug('draft-post')).rejects.toThrow(NotFoundException);
  });
});
