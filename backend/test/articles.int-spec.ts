import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';

const BASE_POST = {
  title: 'Test Article',
  content: 'Article body content',
};

describe('blog articles', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let admin: TestActor;
  let visitor: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    visitor = await createUser(database, 'LEARNER');
  });

  async function createPost(body: Record<string, unknown>, expectedStatus = 201) {
    return request(app.getHttpServer())
      .post('/blog/posts')
      .set(...authHeader(app, admin))
      .send(body)
      .expect(expectedStatus);
  }

  it('a new post is created as DRAFT by default', async () => {
    const res = await createPost(BASE_POST);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.publishedAt).toBeNull();
  });

  it('a draft is not publicly readable', async () => {
    const res = await createPost(BASE_POST);
    const slug = res.body.slug;
    await request(app.getHttpServer())
      .get(`/blog/posts/public/${slug}`)
      .expect(404);
    const list = await request(app.getHttpServer())
      .get('/blog/posts/public')
      .expect(200);
    expect(list.body.data).toHaveLength(0);
  });

  it('explicit publish action makes a post publicly readable', async () => {
    const res = await createPost(BASE_POST);
    const id = res.body.id;
    const slug = res.body.slug;

    await request(app.getHttpServer())
      .post(`/blog/posts/${id}/publish`)
      .set(...authHeader(app, admin))
      .expect(200);

    const pub = await request(app.getHttpServer())
      .get(`/blog/posts/public/${slug}`)
      .expect(200);
    expect(pub.body.status).toBe('PUBLISHED');
    expect(pub.body.publishedAt).not.toBeNull();
  });

  it('publication is reversible — unpublish returns post to draft', async () => {
    const res = await createPost(BASE_POST);
    const id = res.body.id;
    const slug = res.body.slug;

    await request(app.getHttpServer())
      .post(`/blog/posts/${id}/publish`)
      .set(...authHeader(app, admin))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/blog/posts/public/${slug}`)
      .expect(200);

    const after = await request(app.getHttpServer())
      .post(`/blog/posts/${id}/unpublish`)
      .set(...authHeader(app, admin))
      .expect(200);
    expect(after.body.status).toBe('DRAFT');

    await request(app.getHttpServer())
      .get(`/blog/posts/public/${slug}`)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get('/blog/posts/public')
      .expect(200);
    expect(list.body.data).toHaveLength(0);
  });

  it('a scheduled post publishes through the job queue when the scheduled time arrives', async () => {
    const res = await createPost(BASE_POST);
    const id = res.body.id;
    const slug = res.body.slug;

    const scheduledAt = new Date(clock.now().getTime() + 60_000).toISOString();

    await request(app.getHttpServer())
      .post(`/blog/posts/${id}/schedule`)
      .set(...authHeader(app, admin))
      .send({ scheduledAt })
      .expect(200);

    const scheduled = await request(app.getHttpServer())
      .get(`/blog/posts/${id}`)
      .set(...authHeader(app, admin))
      .expect(200);
    expect(scheduled.body.status).toBe('SCHEDULED');

    await request(app.getHttpServer())
      .get(`/blog/posts/public/${slug}`)
      .expect(404);

    clock.advance(120_000);
    await queue.enqueue('blog.schedule.publish', undefined);

    await request(app.getHttpServer())
      .get(`/blog/posts/public/${slug}`)
      .expect(200);
  });

  it('a scheduled post does not publish before its scheduled time', async () => {
    const res = await createPost(BASE_POST);
    const id = res.body.id;
    const slug = res.body.slug;

    const scheduledAt = new Date(clock.now().getTime() + 3_600_000).toISOString();

    await request(app.getHttpServer())
      .post(`/blog/posts/${id}/schedule`)
      .set(...authHeader(app, admin))
      .send({ scheduledAt })
      .expect(200);

    clock.advance(1_000);
    await queue.enqueue('blog.schedule.publish', undefined);

    await request(app.getHttpServer())
      .get(`/blog/posts/public/${slug}`)
      .expect(404);
  });

  it('only PLATFORM_ADMIN can create blog posts', async () => {
    await request(app.getHttpServer())
      .post('/blog/posts')
      .set(...authHeader(app, visitor))
      .send(BASE_POST)
      .expect(403);
  });

  it('only PLATFORM_ADMIN can publish posts', async () => {
    const res = await createPost(BASE_POST);
    await request(app.getHttpServer())
      .post(`/blog/posts/${res.body.id}/publish`)
      .set(...authHeader(app, visitor))
      .expect(403);
  });

  it('admin can soft-delete a post', async () => {
    const res = await createPost(BASE_POST);
    const id = res.body.id;

    await request(app.getHttpServer())
      .delete(`/blog/posts/${id}`)
      .set(...authHeader(app, admin))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/blog/posts/${id}`)
      .set(...authHeader(app, admin))
      .expect(404);
  });

  it('slug conflict returns 409', async () => {
    await createPost({ ...BASE_POST, slug: 'fixed-slug' });
    await createPost({ ...BASE_POST, title: 'Another', slug: 'fixed-slug' }, 409);
  });

  it('admin list includes all statuses', async () => {
    await createPost(BASE_POST);
    const res2 = await createPost({ ...BASE_POST, title: 'Second' });
    await request(app.getHttpServer())
      .post(`/blog/posts/${res2.body.id}/publish`)
      .set(...authHeader(app, admin));

    const list = await request(app.getHttpServer())
      .get('/blog/posts')
      .set(...authHeader(app, admin))
      .expect(200);
    expect(list.body.data).toHaveLength(2);
  });

  it('public list only shows published posts', async () => {
    await createPost(BASE_POST);
    const res2 = await createPost({ ...BASE_POST, title: 'Published' });
    await request(app.getHttpServer())
      .post(`/blog/posts/${res2.body.id}/publish`)
      .set(...authHeader(app, admin));

    const list = await request(app.getHttpServer())
      .get('/blog/posts/public')
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].title).toBe('Published');
  });
});
