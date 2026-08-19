import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';
import { courseSections } from '../src/database/schema';
import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import {
  createUser,
  createCategory,
  createCourse,
  createSection,
} from './support/factories';

describe('POST /sections/reorder', () => {
  let database: TestDatabase;
  let app: INestApplication;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
  });

  async function orderOf(sectionId: string): Promise<number> {
    const [row] = await database.db
      .select({ order: courseSections.order })
      .from(courseSections)
      .where(eq(courseSections.sectionId, sectionId));
    return row.order;
  }

  async function anInstructorWithACourse(): Promise<{
    actor: TestActor;
    courseId: string;
  }> {
    const actor = await createUser(database, 'INSTRUCTOR');
    const categoryId = await createCategory(database);
    const courseId = await createCourse(database, actor.userId, categoryId);
    return { actor, courseId };
  }

  it('reorders sections the caller owns', async () => {
    const { actor, courseId } = await anInstructorWithACourse();
    const first = await createSection(database, courseId, 1);
    const second = await createSection(database, courseId, 2);

    await request(app.getHttpServer())
      .post('/sections/reorder')
      .set(...authHeader(app, actor))
      .send({
        courseId,
        modules: [
          { sectionId: first, order: 2 },
          { sectionId: second, order: 1 },
        ],
      })
      .expect(200);

    expect(await orderOf(first)).toBe(2);
    expect(await orderOf(second)).toBe(1);
  });

  const LOWEST_ID = '00000000-0000-4000-8000-000000000001';
  const HIGHEST_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  it('does not reorder a section belonging to another instructor', async () => {
    const attacker = await anInstructorWithACourse();
    const victim = await anInstructorWithACourse();

    const ownSection = await createSection(
      database,
      attacker.courseId,
      1,
      LOWEST_ID,
    );
    const victimSection = await createSection(
      database,
      victim.courseId,
      1,
      HIGHEST_ID,
    );

    await request(app.getHttpServer())
      .post('/sections/reorder')
      .set(...authHeader(app, attacker.actor))
      .send({
        courseId: attacker.courseId,
        modules: [
          { sectionId: ownSection, order: 5 },
          { sectionId: victimSection, order: 99 },
        ],
      });

    expect(await orderOf(victimSection)).toBe(1);
  });

  it('refuses a reorder containing only another instructor’s sections', async () => {
    const attacker = await anInstructorWithACourse();
    const victim = await anInstructorWithACourse();
    const victimSection = await createSection(database, victim.courseId, 1);

    await request(app.getHttpServer())
      .post('/sections/reorder')
      .set(...authHeader(app, attacker.actor))
      .send({
        courseId: attacker.courseId,
        modules: [{ sectionId: victimSection, order: 42 }],
      })
      .expect(403);

    expect(await orderOf(victimSection)).toBe(1);
  });
});
