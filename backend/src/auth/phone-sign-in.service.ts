import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { phoneSignInCodes } from '../database/schema';
import { SIGN_IN_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import { SMS_SENDER, SmsSender } from './ports/sms-sender';
import { IdentityService } from './identity.service';

export const PHONE_SIGN_IN_INVALID = 'PHONE_SIGN_IN_INVALID';

interface SignInConfig {
  otpLength: number;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
}

@Injectable()
export class PhoneSignInService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
    private readonly settings: SettingsService,
    private readonly identityService: IdentityService,
  ) {}

  async requestCode(phone: string, ipAddress: string | null): Promise<void> {
    const cfg = await this.signInConfig();
    const code = this.generateCode(cfg.otpLength);
    const hash = hashCode(code);
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + cfg.otpTtlSeconds * 1000);

    await this.db.insert(phoneSignInCodes).values({
      phone,
      codeHash: hash,
      expiresAt,
      ipAddress,
      createdAt: now,
    });

    await this.smsSender.send(
      phone,
      `Your groEdu verification code is ${code}. It expires in ${Math.floor(cfg.otpTtlSeconds / 60)} minutes.`,
    );
  }

  async verifyCode(phone: string, code: string): Promise<string> {
    await this.consumeCode(phone, code);

    const existing = await this.identityService.resolveByIdentity('PHONE', phone);
    if (existing) {
      await this.identityService.touchLastUsed(existing, 'PHONE');
      return existing;
    }

    const email = phoneEmail(phone);
    return this.identityService.createUserWithIdentity('PHONE', phone, email);
  }

  async verifyCodeOnly(phone: string, code: string): Promise<void> {
    await this.consumeCode(phone, code);
  }

  private async consumeCode(phone: string, code: string): Promise<void> {
    const cfg = await this.signInConfig();
    const now = this.clock.now();

    const [record] = await this.db
      .select()
      .from(phoneSignInCodes)
      .where(
        and(
          eq(phoneSignInCodes.phone, phone),
          isNull(phoneSignInCodes.consumedAt),
          gt(phoneSignInCodes.expiresAt, now),
        ),
      )
      .orderBy(phoneSignInCodes.createdAt)
      .limit(1);

    if (!record) {
      throw new UnauthorizedException({
        code: PHONE_SIGN_IN_INVALID,
        message: 'Invalid or expired code',
      });
    }

    if (record.attemptCount >= cfg.otpMaxAttempts) {
      throw new HttpException(
        {
          code: PHONE_SIGN_IN_INVALID,
          message: 'Too many failed attempts. Request a new code.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const hashMatches = hashCode(code) === record.codeHash;

    if (!hashMatches) {
      await this.db
        .update(phoneSignInCodes)
        .set({ attemptCount: record.attemptCount + 1 })
        .where(eq(phoneSignInCodes.codeId, record.codeId));

      throw new UnauthorizedException({
        code: PHONE_SIGN_IN_INVALID,
        message: 'Invalid or expired code',
      });
    }

    await this.db
      .update(phoneSignInCodes)
      .set({ consumedAt: now })
      .where(eq(phoneSignInCodes.codeId, record.codeId));
  }

  private generateCode(length: number): string {
    const max = Math.pow(10, length);
    return randomInt(max).toString().padStart(length, '0');
  }

  private async signInConfig(): Promise<SignInConfig> {
    const group = await this.settings.getGroup(SIGN_IN_SETTINGS_GROUP);
    return {
      otpLength: Number(group.values.otpLength) || 6,
      otpTtlSeconds: Number(group.values.otpTtlSeconds) || 300,
      otpMaxAttempts: Number(group.values.otpMaxAttempts) || 5,
    };
  }
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function phoneEmail(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return `phone.${normalized}@groedu.internal`;
}
