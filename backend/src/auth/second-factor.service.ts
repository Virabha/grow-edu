import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../audit/audit-log.service";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  secondFactorChallenges,
  userSecondFactors,
  users,
} from "../database/schema";
import {
  generateRecoveryCodes,
  generateSecret,
  otpauthUri,
  verifyCode,
} from "./totp";

export const SECOND_FACTOR_REQUIRED = "SECOND_FACTOR_REQUIRED";
export const SECOND_FACTOR_SETUP_REQUIRED = "SECOND_FACTOR_SETUP_REQUIRED";
export const SECOND_FACTOR_INVALID = "SECOND_FACTOR_INVALID";

const STAFF_ROLES = new Set(["PLATFORM_ADMIN", "INSTRUCTOR", "CORPORATE_ADMIN"]);
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ISSUER = "groEdu";

export function requiresSecondFactor(role: string): boolean {
  return STAFF_ROLES.has(role);
}

export function hashChallengeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class SecondFactorService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly auditLog: AuditLogService,
  ) {}

  async enrolmentFor(userId: string) {
    const [row] = await this.db
      .select()
      .from(userSecondFactors)
      .where(eq(userSecondFactors.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async isActiveFor(userId: string): Promise<boolean> {
    const enrolment = await this.enrolmentFor(userId);
    return enrolment !== null && enrolment.confirmedAt !== null;
  }

  async begin(userId: string, email: string) {
    const existing = await this.enrolmentFor(userId);
    if (existing?.confirmedAt) {
      throw new ConflictException(
        "A second factor is already set up. Reset it before setting up another.",
      );
    }

    const secret = generateSecret();
    const recoveryCodes = generateRecoveryCodes();
    const now = this.clock.now();

    await this.db
      .insert(userSecondFactors)
      .values({ userId, secret, recoveryCodes, updatedAt: now })
      .onConflictDoUpdate({
        target: userSecondFactors.userId,
        set: { secret, recoveryCodes, confirmedAt: null, updatedAt: now },
      });

    return {
      secret,
      recoveryCodes,
      otpauthUri: otpauthUri(secret, email, ISSUER),
    };
  }

  async confirm(userId: string, code: string) {
    const enrolment = await this.enrolmentFor(userId);
    if (!enrolment) {
      throw new BadRequestException("Start the setup before confirming it");
    }
    if (enrolment.confirmedAt) {
      throw new ConflictException("A second factor is already set up");
    }
    if (!verifyCode(enrolment.secret, code, this.clock.epochMillis())) {
      throw new UnauthorizedException({
        code: SECOND_FACTOR_INVALID,
        message: "That code is not right. Try the current one.",
      });
    }

    const now = this.clock.now();
    await this.db
      .update(userSecondFactors)
      .set({ confirmedAt: now, updatedAt: now })
      .where(eq(userSecondFactors.userId, userId));

    await this.auditLog.record({
      action: "second-factor.enrol",
      targetType: "user",
      targetId: userId,
      after: { confirmedAt: now.toISOString() },
    });

    return { enrolled: true, recoveryCodes: enrolment.recoveryCodes };
  }

  async issueChallenge(
    userId: string,
    userAgent: string | null,
    ipAddress: string | null,
  ): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const now = this.clock.now();

    await this.db.insert(secondFactorChallenges).values({
      userId,
      tokenHash: hashChallengeToken(token),
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
      userAgent,
      ipAddress,
    });

    return token;
  }

  async userForChallenge(token: string): Promise<string> {
    const [challenge] = await this.db
      .select({ userId: secondFactorChallenges.userId })
      .from(secondFactorChallenges)
      .where(
        and(
          eq(secondFactorChallenges.tokenHash, hashChallengeToken(token)),
          isNull(secondFactorChallenges.consumedAt),
          gt(secondFactorChallenges.expiresAt, this.clock.now()),
        ),
      )
      .limit(1);
    if (!challenge) {
      throw new UnauthorizedException({
        code: SECOND_FACTOR_INVALID,
        message: "That sign-in attempt has expired. Start again.",
      });
    }
    return challenge.userId;
  }

  async redeemChallenge(token: string, code: string): Promise<string> {
    const now = this.clock.now();
    const [challenge] = await this.db
      .select()
      .from(secondFactorChallenges)
      .where(
        and(
          eq(secondFactorChallenges.tokenHash, hashChallengeToken(token)),
          isNull(secondFactorChallenges.consumedAt),
          gt(secondFactorChallenges.expiresAt, now),
        ),
      )
      .limit(1);

    if (!challenge) {
      throw new UnauthorizedException({
        code: SECOND_FACTOR_INVALID,
        message: "That sign-in attempt has expired. Start again.",
      });
    }

    const enrolment = await this.enrolmentFor(challenge.userId);
    if (!enrolment?.confirmedAt) {
      throw new UnauthorizedException({
        code: SECOND_FACTOR_SETUP_REQUIRED,
        message: "This account has no second factor set up yet.",
      });
    }

    const offered = code.trim();
    const byRecovery = enrolment.recoveryCodes.includes(offered.toUpperCase());
    const byCode = verifyCode(
      enrolment.secret,
      offered,
      this.clock.epochMillis(),
    );

    if (!byRecovery && !byCode) {
      throw new UnauthorizedException({
        code: SECOND_FACTOR_INVALID,
        message: "That code is not right.",
      });
    }

    if (byCode && enrolment.lastUsedCode === offered) {
      throw new UnauthorizedException({
        code: SECOND_FACTOR_INVALID,
        message: "That code has already been used. Wait for the next one.",
      });
    }

    await this.db
      .update(secondFactorChallenges)
      .set({ consumedAt: now })
      .where(
        eq(secondFactorChallenges.challengeId, challenge.challengeId),
      );

    await this.db
      .update(userSecondFactors)
      .set({
        lastUsedAt: now,
        lastUsedCode: byCode ? offered : enrolment.lastUsedCode,
        recoveryCodes: byRecovery
          ? enrolment.recoveryCodes.filter(
              (c) => c !== offered.toUpperCase(),
            )
          : enrolment.recoveryCodes,
        updatedAt: now,
      })
      .where(eq(userSecondFactors.userId, challenge.userId));

    await this.auditLog.record({
      action: byRecovery ? "second-factor.recover" : "second-factor.use",
      targetType: "user",
      targetId: challenge.userId,
      after: { at: now.toISOString(), viaRecoveryCode: byRecovery },
    });

    return challenge.userId;
  }

  async reset(userId: string, actingAdminId: string) {
    const [target] = await this.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    if (!target) {
      throw new BadRequestException("No such account");
    }

    await this.db
      .delete(userSecondFactors)
      .where(eq(userSecondFactors.userId, userId));

    await this.auditLog.record({
      action: "second-factor.reset",
      targetType: "user",
      targetId: userId,
      after: { resetBy: actingAdminId },
    });

    return { reset: true };
  }

  async disable(userId: string, code: string) {
    const enrolment = await this.enrolmentFor(userId);
    if (!enrolment?.confirmedAt) {
      throw new BadRequestException("There is no second factor to turn off");
    }

    const [account] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (account && requiresSecondFactor(account.role)) {
      throw new ConflictException(
        "Staff accounts must keep a second factor. Reset it instead of turning it off.",
      );
    }

    if (!verifyCode(enrolment.secret, code, this.clock.epochMillis())) {
      throw new UnauthorizedException({
        code: SECOND_FACTOR_INVALID,
        message: "That code is not right.",
      });
    }

    await this.db
      .delete(userSecondFactors)
      .where(eq(userSecondFactors.userId, userId));

    await this.auditLog.record({
      action: "second-factor.disable",
      targetType: "user",
      targetId: userId,
      after: { at: this.clock.now().toISOString() },
    });

    return { enrolled: false };
  }
}
