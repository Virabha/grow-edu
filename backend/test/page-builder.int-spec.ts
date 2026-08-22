import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';

describe('page builder', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
  });

  async function createPage(actor: TestActor, body: Record<string, unknown>, status = 201) {
    return request(app.getHttpServer())
      .post('/pages')
      .set(...authHeader(app, actor))
      .send(body)
      .expect(status);
  }

  it('creates a page with valid blocks from the palette', async () => {
    const res = await createPage(admin, {
      title: 'Home',
      blocks: [
        { kind: 'HERO', displayOrder: 0, visible: true, config: { headline: 'Welcome' } },
        { kind: 'FAQ', displayOrder: 1, visible: true, config: {} },
      ],
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.blocks).toHaveLength(2);
    expect(res.body.slug).toBe('home');
  });

  it('rejects a block kind outside the palette', async () => {
    await createPage(admin, {
      title: 'Bad',
      blocks: [{ kind: 'DRAG_DROP_WHATEVER', displayOrder: 0, visible: true, config: {} }],
    }, 400);
  });

  it('rejects blocks that is not an array', async () => {
    await createPage(admin, {
      title: 'Bad',
      blocks: { kind: 'HERO' },
    }, 400);
  });

  it('a draft page is not publicly readable', async () => {
    const res = await createPage(admin, { title: 'Draft Page' });
    const slug = res.body.slug;
    await request(app.getHttpServer())
      .get(`/pages/public/${slug}`)
      .expect(404);
  });

  it('publishing is an explicit action — saving does not publish', async () => {
    const res = await createPage(admin, { title: 'My Page' });
    const id = res.body.id;
    const slug = res.body.slug;

    await request(app.getHttpServer())
      .patch(`/pages/${id}`)
      .set(...authHeader(app, admin))
      .send({ title: 'My Page Updated' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/pages/public/${slug}`)
      .expect(404);
  });

  it('published page is publicly readable after explicit publish action', async () => {
    const res = await createPage(admin, { title: 'Published Page' });
    const id = res.body.id;
    const slug = res.body.slug;

    await request(app.getHttpServer())
      .post(`/pages/${id}/publish`)
      .set(...authHeader(app, admin))
      .expect(200);

    const pub = await request(app.getHttpServer())
      .get(`/pages/public/${slug}`)
      .expect(200);
    expect(pub.body.status).toBe('PUBLISHED');
    expect(pub.body.title).toBe('Published Page');
  });

  it('unpublishing returns a page to draft and hides it from public', async () => {
    const res = await createPage(admin, { title: 'Toggle Page' });
    const id = res.body.id;
    const slug = res.body.slug;

    await request(app.getHttpServer())
      .post(`/pages/${id}/publish`)
      .set(...authHeader(app, admin))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/pages/public/${slug}`)
      .expect(200);

    const after = await request(app.getHttpServer())
      .post(`/pages/${id}/unpublish`)
      .set(...authHeader(app, admin))
      .expect(200);
    expect(after.body.status).toBe('DRAFT');

    await request(app.getHttpServer())
      .get(`/pages/public/${slug}`)
      .expect(404);
  });

  it('blocks can be reordered and hidden via update', async () => {
    const res = await createPage(admin, {
      title: 'Blocks Page',
      blocks: [
        { kind: 'HERO', displayOrder: 0, visible: true, config: {} },
        { kind: 'CTA', displayOrder: 1, visible: true, config: {} },
      ],
    });
    const id = res.body.id;

    const updated = await request(app.getHttpServer())
      .patch(`/pages/${id}`)
      .set(...authHeader(app, admin))
      .send({
        blocks: [
          { kind: 'CTA', displayOrder: 0, visible: false, config: {} },
          { kind: 'HERO', displayOrder: 1, visible: true, config: {} },
        ],
      })
      .expect(200);

    expect(updated.body.blocks[0].kind).toBe('CTA');
    expect(updated.body.blocks[0].visible).toBe(false);
  });

  it('admin can list all pages including drafts', async () => {
    await createPage(admin, { title: 'A' });
    await createPage(admin, { title: 'B' });
    const res = await request(app.getHttpServer())
      .get('/pages')
      .set(...authHeader(app, admin))
      .expect(200);
    expect(res.body).toHaveLength(2);
  });

  it('students cannot list or manage pages', async () => {
    await request(app.getHttpServer())
      .get('/pages')
      .set(...authHeader(app, student))
      .expect(403);

    await request(app.getHttpServer())
      .post('/pages')
      .set(...authHeader(app, student))
      .send({ title: 'Hacked' })
      .expect(403);
  });

  it('slug conflict is rejected with 409', async () => {
    await createPage(admin, { title: 'My Page', slug: 'unique-slug' });
    await createPage(admin, { title: 'Another', slug: 'unique-slug' }, 409);
  });

  it('palette endpoint is public', async () => {
    const res = await request(app.getHttpServer())
      .get('/pages/palette')
      .expect(200);
    expect(res.body.kinds).toContain('HERO');
    expect(res.body.kinds).toContain('FAQ');
  });

  it('deleting a page removes it', async () => {
    const res = await createPage(admin, { title: 'Temp Page' });
    const id = res.body.id;

    await request(app.getHttpServer())
      .delete(`/pages/${id}`)
      .set(...authHeader(app, admin))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/pages/${id}`)
      .set(...authHeader(app, admin))
      .expect(404);
  });
});
