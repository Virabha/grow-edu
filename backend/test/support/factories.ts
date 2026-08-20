import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import {
  users,
  categories,
  companies,
  courses,
  courseSections,
  batches,
} from '../../src/database/schema';
import { TestDatabase } from './test-database';
import { TestActor } from './test-app';

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${randomUUID().slice(0, 8)}`;
}

export async function createUser(
  database: TestDatabase,
  role: string,
): Promise<TestActor> {
  const userId = randomUUID();
  const email = `${unique(role.toLowerCase())}@example.test`;
  await database.db.insert(users).values({
    userId,
    email,
    password: 'not-a-real-hash',
    role: role as never,
  });
  return { userId, email, role };
}

export async function createSignInUser(
  database: TestDatabase,
  role: string,
  password: string,
): Promise<TestActor> {
  const userId = randomUUID();
  const email = `${unique(role.toLowerCase())}@example.test`;
  await database.db.insert(users).values({
    userId,
    email,
    password: await bcrypt.hash(password, 4),
    role: role as never,
    emailVerified: true,
  });
  return { userId, email, role };
}

export async function createCorporateAdmin(
  database: TestDatabase,
  companyId: string,
): Promise<TestActor> {
  const actor = await createUser(database, 'CORPORATE_ADMIN');
  await database.db
    .update(users)
    .set({ companyId })
    .where(eq(users.userId, actor.userId));
  return actor;
}

export async function createCompany(database: TestDatabase): Promise<string> {
  const companyId = randomUUID();
  await database.db.insert(companies).values({
    companyId,
    name: unique('college'),
    email: `${unique('college')}@example.test`,
  });
  return companyId;
}

export async function createBatch(
  database: TestDatabase,
  createdBy: string,
  price = '0',
): Promise<string> {
  const batchId = randomUUID();
  await database.db.insert(batches).values({
    batchId,
    title: unique('batch'),
    slug: unique('batch'),
    price,
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2027-06-30T00:00:00.000Z'),
    status: 'ONGOING' as never,
    createdBy,
  });
  return batchId;
}

export async function createCategory(database: TestDatabase): Promise<string> {
  const categoryId = randomUUID();
  await database.db.insert(categories).values({
    categoryId,
    name: unique('category'),
    slug: unique('category'),
  });
  return categoryId;
}

export async function createCourse(
  database: TestDatabase,
  instructorId: string,
  categoryId: string,
): Promise<string> {
  const courseId = randomUUID();
  await database.db.insert(courses).values({
    courseId,
    title: unique('course'),
    slug: unique('course'),
    description: 'A course created by the integration test factory.',
    categoryId,
    instructorId,
  });
  return courseId;
}

export async function createSection(
  database: TestDatabase,
  courseId: string,
  order: number,
  sectionId: string = randomUUID(),
): Promise<string> {
  await database.db.insert(courseSections).values({
    sectionId,
    courseId,
    title: unique('section'),
    order,
  });
  return sectionId;
}
