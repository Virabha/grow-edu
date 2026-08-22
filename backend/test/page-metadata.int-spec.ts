import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';

describe('page metadata and structured data', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;

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
  });

  async function createPage(body: Record<string, unknown>, expectedStatus = 201) {
    return request(app.getHttpServer())
      .post('/pages')
      .set(...authHeader(app, admin))
      .send(body)
      .expect(expectedStatus);
  }

  async function createPost(body: Record<string, unknown>, expectedStatus = 201) {
    return request(app.getHttpServer())
      .post('/blog/posts')
      .set(...authHeader(app, admin))
      .send({ title: 'Post', content: 'Body', ...body })
      .expect(expectedStatus);
  }

  describe('landing pages', () => {
    it('stores owner-controlled metadata on a landing page', async () => {
      const res = await createPage({
        title: 'Pricing',
        metaTitle: 'Best Pricing Plans',
        metaDescription: 'Find the right plan for you',
        canonicalUrl: 'https://example.com/pricing',
        ogImageUrl: 'https://example.com/pricing.png',
      });
      expect(res.body.metaTitle).toBe('Best Pricing Plans');
      expect(res.body.metaDescription).toBe('Find the right plan for you');
      expect(res.body.canonicalUrl).toBe('https://example.com/pricing');
      expect(res.body.ogImageUrl).toBe('https://example.com/pricing.png');
    });

    it('metadata is served with the published page (not a separate request)', async () => {
      const res = await createPage({
        title: 'Features',
        metaTitle: 'Our Features',
        metaDescription: 'What we offer',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Features',
        },
      });
      const id = res.body.id;
      const slug = res.body.slug;

      await request(app.getHttpServer())
        .post(`/pages/${id}/publish`)
        .set(...authHeader(app, admin))
        .expect(200);

      const pub = await request(app.getHttpServer())
        .get(`/pages/public/${slug}`)
        .expect(200);

      expect(pub.body.metaTitle).toBe('Our Features');
      expect(pub.body.metaDescription).toBe('What we offer');
      expect(pub.body.structuredData['@type']).toBe('WebPage');
    });

    it('a page with no explicit metadata still has a title from the page title', async () => {
      const res = await createPage({ title: 'About Us' });
      const id = res.body.id;
      expect(res.body.title).toBe('About Us');
      expect(res.body.metaTitle).toBeNull();
    });

    it('rejects malformed structured data at write time — missing @context', async () => {
      await createPage({
        title: 'Bad SD',
        structuredData: { '@type': 'WebPage', name: 'Missing context' },
      }, 422);
    });

    it('rejects malformed structured data at write time — missing @type', async () => {
      await createPage({
        title: 'Bad SD',
        structuredData: { '@context': 'https://schema.org', name: 'Missing type' },
      }, 422);
    });

    it('rejects structured data with invalid @context type', async () => {
      await createPage({
        title: 'Bad SD',
        structuredData: { '@context': 123, '@type': 'WebPage' },
      }, 422);
    });

    it('valid structured data with array @type is accepted', async () => {
      const res = await createPage({
        title: 'Multi-type',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': ['WebPage', 'FAQPage'],
          name: 'Multi',
        },
      });
      expect(res.body.structuredData['@type']).toEqual(['WebPage', 'FAQPage']);
    });
  });

  describe('blog posts', () => {
    it('stores owner-controlled metadata on a blog post', async () => {
      const res = await createPost({
        metaTitle: 'SEO Title',
        metaDescription: 'SEO description',
        canonicalUrl: 'https://example.com/post',
        ogImageUrl: 'https://example.com/img.jpg',
      });
      const id = res.body.id;

      const detail = await request(app.getHttpServer())
        .get(`/blog/posts/${id}`)
        .set(...authHeader(app, admin))
        .expect(200);
      expect(detail.body.metaTitle).toBe('SEO Title');
      expect(detail.body.canonicalUrl).toBe('https://example.com/post');
    });

    it('metadata is served with the public post response (not a separate request)', async () => {
      const res = await createPost({
        title: 'Metadata Post',
        metaTitle: 'The Real Meta Title',
        metaDescription: 'A great summary',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Metadata Post',
        },
      });
      const id = res.body.id;

      await request(app.getHttpServer())
        .post(`/blog/posts/${id}/publish`)
        .set(...authHeader(app, admin))
        .expect(200);

      const pub = await request(app.getHttpServer())
        .get(`/blog/posts/public/${res.body.slug}`)
        .expect(200);

      expect(pub.body.meta.title).toBe('The Real Meta Title');
      expect(pub.body.meta.description).toBe('A great summary');
      expect(pub.body.meta.structuredData['@type']).toBe('Article');
    });

    it('blog post with no explicit meta falls back to title and excerpt for meta fields', async () => {
      const res = await createPost({ title: 'Plain Post', excerpt: 'Short summary' });
      const id = res.body.id;

      await request(app.getHttpServer())
        .post(`/blog/posts/${id}/publish`)
        .set(...authHeader(app, admin))
        .expect(200);

      const pub = await request(app.getHttpServer())
        .get(`/blog/posts/public/${res.body.slug}`)
        .expect(200);

      expect(pub.body.meta.title).toBe('Plain Post');
      expect(pub.body.meta.description).toBe('Short summary');
      expect(pub.body.meta.structuredData).toBeNull();
    });

    it('rejects malformed structured data at write time for blog posts', async () => {
      await createPost({
        structuredData: { name: 'No context no type' },
      }, 422);
    });

    it('rejects structured data with invalid @type on blog post', async () => {
      await createPost({
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 42,
        },
      }, 422);
    });
  });
});
