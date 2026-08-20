import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  users,
  categories,
  courses,
  courseSections,
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
