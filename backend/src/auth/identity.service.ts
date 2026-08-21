import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, count, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { userIdentities, users } from '../database/schema';

type Provider = 'PHONE' | 'GOOGLE' | 'PASSWORD';

@Injectable()
export class IdentityService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async resolveByIdentity(
    provider: 'PHONE' | 'GOOGLE',
    subject: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(
        and(
          eq(userIdentities.provider, provider),
          eq(userIdentities.subject, subject),
        ),
      )
      .limit(1);
    return row?.userId ?? null;
  }

  async resolveByEmail(email: string): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row?.userId ?? null;
  }

  async createUserWithIdentity(
    provider: 'PHONE' | 'GOOGLE',
    subject: string,
    email: string,
    firstName?: string,
  ): Promise<string> {
    const password = await bcrypt.hash(crypto.randomUUID(), 10);
    const now = this.clock.now();

    const [newUser] = await this.db
      .insert(users)
      .values({
        email,
        password,
        role: 'LEARNER',
        firstName: firstName ?? null,
        emailVerified: provider === 'GOOGLE',
      })
      .returning({ userId: users.userId });

    await this.db.insert(userIdentities).values({
      userId: newUser.userId,
      provider,
      subject,
      verifiedAt: now,
      lastUsedAt: now,
      createdAt: now,
    });

    return newUser.userId;
  }

  async linkIdentity(
    userId: string,
    provider: Provider,
    subject: string,
  ): Promise<void> {
    const now = this.clock.now();
    try {
      await this.db.insert(userIdentities).values({
        userId,
        provider,
        subject,
        verifiedAt: now,
        lastUsedAt: now,
        createdAt: now,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'This identity is already claimed by another account',
        );
      }
      throw err;
    }
  }

  async unlinkIdentity(
    userId: string,
    provider: 'PHONE' | 'GOOGLE',
  ): Promise<void> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(userIdentities)
      .where(eq(userIdentities.userId, userId));

    if (total <= 1) {
      throw new UnprocessableEntityException(
        'Cannot remove the last sign-in method from this account',
      );
    }

    await this.db
      .delete(userIdentities)
      .where(
        and(
          eq(userIdentities.userId, userId),
          eq(userIdentities.provider, provider),
        ),
      );
  }

  async listIdentities(userId: string) {
    return this.db
      .select({
        provider: userIdentities.provider,
        verifiedAt: userIdentities.verifiedAt,
        lastUsedAt: userIdentities.lastUsedAt,
      })
      .from(userIdentities)
      .where(eq(userIdentities.userId, userId));
  }

  async touchLastUsed(userId: string, provider: Provider): Promise<void> {
    await this.db
      .update(userIdentities)
      .set({ lastUsedAt: this.clock.now() })
      .where(
        and(
          eq(userIdentities.userId, userId),
          eq(userIdentities.provider, provider),
        ),
      );
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>)['code'] === '23505'
  );
}
