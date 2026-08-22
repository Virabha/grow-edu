import {
  createTestDatabase,
  tableNamesIn,
  truncateAll,
  TestDatabase,
} from './support/test-database';

describe('integration test harness', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterAll(async () => {
    if (database) await database.destroy();
  });

  it('provisions an isolated schema, not public', () => {
    expect(database.schemaName).toMatch(/^test_/);
    expect(database.schemaName).not.toBe('public');
  });

  it('creates the application tables inside that schema', async () => {
    const names = await tableNamesIn(database);
    expect(names).toContain('users');
    expect(names).toContain('batches');
    expect(names).toContain('batch_subjects');
    expect(names).toContain('lessons');
    expect(names.length).toBeGreaterThan(40);
  });

  it('carries no second implementation of the product model', async () => {
    const names = await tableNamesIn(database);
    expect(names).not.toContain('courses');
    expect(names).not.toContain('course_sections');
    expect(names).not.toContain('enrollments');
    expect(names).not.toContain('lesson_quiz_attempts');
    expect(names).not.toContain('live_sessions');
    expect(names).not.toContain('section_access');
  });

  it('ships the default organization with the schema', async () => {
    const [row] = await database.client.unsafe(
      `select slug from organizations where organization_id = '00000000-0000-0000-0000-000000000001'`,
    );
    expect(row?.slug).toBe('groedu');
  });

  it('starts empty and truncates cleanly between tests', async () => {
    await truncateAll(database);
    const [{ count }] = await database.client.unsafe(
      `select count(*)::int as count from users`,
    );
    expect(count).toBe(0);
  });
});
