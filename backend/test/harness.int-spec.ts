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
    expect(names).toContain('courses');
    expect(names).toContain('course_sections');
    expect(names.length).toBeGreaterThan(40);
  });

  it('starts empty and truncates cleanly between tests', async () => {
    await truncateAll(database);
    const [{ count }] = await database.client.unsafe(
      `select count(*)::int as count from users`,
    );
    expect(count).toBe(0);
  });
});
