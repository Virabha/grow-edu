import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as bcrypt from "bcrypt";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  corporateSsoConfigs,
  corporateSsoLinks,
  users,
} from "../../database/schema";
import { CLOCK, Clock } from "../../common/clock";
import { SSO_PROVIDER, SsoProvider, trustedClaimsOnly } from "./sso-provider";
import { ConfigureSsoDto } from "./dto/configure-sso.dto";

@Injectable()
export class SsoService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SSO_PROVIDER) private readonly provider: SsoProvider,
  ) {}

  async configure(
    companyId: string,
    dto: ConfigureSsoDto,
    actorId: string,
  ): Promise<void> {
    const now = this.clock.now();
    await this.db
      .insert(corporateSsoConfigs)
      .values({
        companyId,
        providerType: dto.providerType,
        issuerUrl: dto.issuerUrl,
        clientId: dto.clientId,
        clientSecret: dto.clientSecret,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: corporateSsoConfigs.companyId,
        set: {
          providerType: dto.providerType,
          issuerUrl: dto.issuerUrl,
          clientId: dto.clientId,
          clientSecret: dto.clientSecret,
          updatedAt: now,
        },
      });
  }

  async getConfig(companyId: string, actorUserId: string, actorRole: string) {
    if (actorRole === "CORPORATE_ADMIN") {
      const [userRow] = await this.db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.userId, actorUserId))
        .limit(1);

      if (!userRow?.companyId || userRow.companyId !== companyId) {
        throw new NotFoundException("SSO configuration not found");
      }
    }

    const [row] = await this.db
      .select({
        ssoConfigId: corporateSsoConfigs.ssoConfigId,
        companyId: corporateSsoConfigs.companyId,
        providerType: corporateSsoConfigs.providerType,
        issuerUrl: corporateSsoConfigs.issuerUrl,
        clientId: corporateSsoConfigs.clientId,
        createdAt: corporateSsoConfigs.createdAt,
        updatedAt: corporateSsoConfigs.updatedAt,
      })
      .from(corporateSsoConfigs)
      .where(eq(corporateSsoConfigs.companyId, companyId))
      .limit(1);

    if (!row) {
      throw new NotFoundException("SSO configuration not found");
    }

    return row;
  }

  async deleteConfig(companyId: string): Promise<void> {
    await this.db
      .delete(corporateSsoConfigs)
      .where(eq(corporateSsoConfigs.companyId, companyId));
  }

  async signIn(companyId: string, token: string): Promise<string> {
    const [config] = await this.db
      .select({ ssoConfigId: corporateSsoConfigs.ssoConfigId })
      .from(corporateSsoConfigs)
      .where(eq(corporateSsoConfigs.companyId, companyId))
      .limit(1);

    if (!config) {
      throw new UnauthorizedException({
        code: "SSO_NOT_CONFIGURED",
        message: "Sign-on failed",
      });
    }

    const asserted = await this.provider.verify(companyId, token);
    const claims = asserted ? trustedClaimsOnly(asserted) : null;
    if (!claims || !claims.emailVerified) {
      throw new UnauthorizedException({
        code: "SSO_INVALID",
        message: "Sign-on failed",
      });
    }

    const [existing] = await this.db
      .select({ userId: corporateSsoLinks.userId })
      .from(corporateSsoLinks)
      .where(
        and(
          eq(corporateSsoLinks.companyId, companyId),
          eq(corporateSsoLinks.externalSubject, claims.subject),
        ),
      )
      .limit(1);

    if (existing) {
      return existing.userId;
    }

    const [byEmail] = await this.db
      .select({ userId: users.userId, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, claims.email))
      .limit(1);

    if (byEmail) {
      if (!byEmail.emailVerified) {
        throw new UnprocessableEntityException({
          code: "EMAIL_NOT_VERIFIED",
          message:
            "An account with this email exists but is not verified. Please verify your email first.",
        });
      }
      await this.db.insert(corporateSsoLinks).values({
        companyId,
        userId: byEmail.userId,
        externalSubject: claims.subject,
        linkedAt: this.clock.now(),
      });
      return byEmail.userId;
    }

    return this.createUserWithSsoLink(companyId, claims.subject, claims.email);
  }

  private async createUserWithSsoLink(
    companyId: string,
    externalSubject: string,
    email: string,
  ): Promise<string> {
    const password = await bcrypt.hash(crypto.randomUUID(), 10);
    const now = this.clock.now();

    const [newUser] = await this.db
      .insert(users)
      .values({
        email,
        password,
        role: "LEARNER",
        emailVerified: true,
      })
      .returning({ userId: users.userId });

    await this.db.insert(corporateSsoLinks).values({
      companyId,
      userId: newUser.userId,
      externalSubject,
      linkedAt: now,
    });

    return newUser.userId;
  }
}
