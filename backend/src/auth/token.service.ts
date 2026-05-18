import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gt } from 'drizzle-orm';
import { emailTokens } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

export type EmailTokenType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

@Injectable()
export class TokenService {
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async generateToken(userId: string, tokenType: EmailTokenType): Promise<string> {
    const token = randomUUID();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

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
    const tokens = await this.db
      .select()
      .from(emailTokens)
      .where(
        and(
          eq(emailTokens.tokenType, tokenType),
          eq(emailTokens.used, false),
          gt(emailTokens.expiresAt, new Date()),
        ),
      );

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.tokenHash);
      if (isValid) {
        return storedToken.userId;
      }
    }

    return null;
  }

  async invalidateToken(token: string, tokenType: EmailTokenType): Promise<void> {
    const tokens = await this.db
      .select()
      .from(emailTokens)
      .where(
        and(
          eq(emailTokens.tokenType, tokenType),
          eq(emailTokens.used, false),
          gt(emailTokens.expiresAt, new Date()),
        ),
      );

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.tokenHash);
      if (isValid) {
        await this.db
          .update(emailTokens)
          .set({ used: true })
          .where(eq(emailTokens.tokenId, storedToken.tokenId));
        return;
      }
    }
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

