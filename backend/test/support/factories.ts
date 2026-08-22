import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import {
  users,
  categories,
  companies,
  batches,
  batchEnrollments,
  batchInstructors,
  batchSubjects,
  lessons,
  subjectLessons,
  corporateSubGroups,
  corporateSubGroupMembers,
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
  overrides: Partial<typeof batches.$inferInsert> = {},
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
    ...overrides,
  });
  return batchId;
}

export async function enrol(
  database: TestDatabase,
  batchId: string,
  userId: string,
  overrides: Partial<typeof batchEnrollments.$inferInsert> = {},
): Promise<void> {
  await database.db
    .insert(batchEnrollments)
    .values({ batchId, userId, ...overrides });
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

export async function assignInstructor(
  database: TestDatabase,
  batchId: string,
  instructorId: string,
  role: 'LEAD' | 'SUBJECT' | 'ASSISTANT' = 'SUBJECT',
): Promise<void> {
  await database.db
    .insert(batchInstructors)
    .values({ batchId, instructorId, role });
}

export async function createSubject(
  database: TestDatabase,
  batchId: string,
): Promise<string> {
  const subjectId = randomUUID();
  await database.db
    .insert(batchSubjects)
    .values({ subjectId, batchId, name: unique('subject') });
  return subjectId;
}

export async function createLesson(
  database: TestDatabase,
  subjectId: string,
  overrides: Partial<typeof lessons.$inferInsert> = {},
): Promise<string> {
  const lessonId = randomUUID();
  await database.db.insert(lessons).values({
    lessonId,
    subjectId,
    title: unique('lesson'),
    type: 'VIDEO',
    status: 'READY',
    order: 1,
    ...overrides,
  });
  await database.db.insert(subjectLessons).values({
    subjectId,
    lessonId,
    order: overrides.order ?? 1,
  });
  return lessonId;
}

export async function placeLesson(
  database: TestDatabase,
  subjectId: string,
  lessonId: string,
  order = 1,
): Promise<void> {
  await database.db
    .insert(subjectLessons)
    .values({ subjectId, lessonId, order });
}

export async function createSubGroup(
  database: TestDatabase,
  contractId: string,
  createdBy: string,
  name?: string,
): Promise<string> {
  const subGroupId = randomUUID();
  await database.db.insert(corporateSubGroups).values({
    subGroupId,
    contractId,
    name: name ?? unique('subgroup'),
    createdBy,
  });
  return subGroupId;
}

export async function addSubGroupMember(
  database: TestDatabase,
  subGroupId: string,
  contractId: string,
  userId: string,
  addedBy: string,
): Promise<void> {
  await database.db.insert(corporateSubGroupMembers).values({
    subGroupId,
    contractId,
    userId,
    addedBy,
  });
}
