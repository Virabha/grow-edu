import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gt } from 'drizzle-orm';
import { emailTokens } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { randomUUID, createHash } from 'crypto';
import { CLOCK, Clock } from '../common/clock';

export type EmailTokenType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

@Injectable()
export class TokenService {
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Tokens are 128-bit random UUIDs — SHA-256 is sufficient for storage;
  // bcrypt is designed for low-entropy passwords and adds ~100ms per lookup with no benefit here.
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async generateToken(userId: string, tokenType: EmailTokenType): Promise<string> {
    const token = randomUUID();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(this.clock.now().getTime() + this.TOKEN_EXPIRY_HOURS * 3_600_000);

    await this.db.insert(emailTokens).values({
      userId,
      tokenType,
      tokenHash,
      expiresAt,
      used: false,
    });

    return token;
  }

  async validateToken(token: string, tokenType: EmailTokenType): Promise<string | null> {
    const tokenHash = this.hashToken(token);
    const [stored] = await this.db
      .select()
      .from(emailTokens)
      .where(
        and(
          eq(emailTokens.tokenHash, tokenHash),
          eq(emailTokens.tokenType, tokenType),
          eq(emailTokens.used, false),
          gt(emailTokens.expiresAt, this.clock.now()),
        ),
      )
      .limit(1);

    return stored?.userId ?? null;
  }

  async invalidateToken(token: string, tokenType: EmailTokenType): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.db
      .update(emailTokens)
      .set({ used: true })
      .where(
        and(
          eq(emailTokens.tokenHash, tokenHash),
          eq(emailTokens.tokenType, tokenType),
          eq(emailTokens.used, false),
          gt(emailTokens.expiresAt, this.clock.now()),
        ),
      );
  }

  async invalidateUserTokens(userId: string, tokenType: EmailTokenType): Promise<void> {
    await this.db
      .update(emailTokens)
      .set({ used: true })
      .where(
        and(
          eq(emailTokens.userId, userId),
          eq(emailTokens.tokenType, tokenType),
          eq(emailTokens.used, false),
        ),
      );
  }
}

