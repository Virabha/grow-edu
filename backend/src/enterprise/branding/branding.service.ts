import {
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  corporateBranding,
  users,
} from "../../database/schema";
import { CLOCK, Clock } from "../../common/clock";
import { ConfigureBrandingDto } from "./dto/configure-branding.dto";

const DEFAULT_BRANDING = {
  name: "groEdu",
  logoUrl: null,
  primaryColor: null,
};

@Injectable()
export class BrandingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async configure(
    companyId: string,
    dto: ConfigureBrandingDto,
    actorUserId: string,
    actorRole: string,
  ): Promise<void> {
    if (actorRole === "CORPORATE_ADMIN") {
      const [userRow] = await this.db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.userId, actorUserId))
        .limit(1);

      if (!userRow?.companyId || userRow.companyId !== companyId) {
        throw new ForbiddenException(
          "You can only configure branding for your own organisation",
        );
      }
    }

    const now = this.clock.now();
    await this.db
      .insert(corporateBranding)
      .values({
        companyId,
        name: dto.name,
        logoUrl: dto.logoUrl ?? null,
        primaryColor: dto.primaryColor ?? null,
        updatedBy: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: corporateBranding.companyId,
        set: {
          name: dto.name,
          logoUrl: dto.logoUrl ?? null,
          primaryColor: dto.primaryColor ?? null,
          updatedBy: actorUserId,
          updatedAt: now,
        },
      });
  }

  async getBrandingForCompany(companyId: string) {
    const [row] = await this.db
      .select({
        name: corporateBranding.name,
        logoUrl: corporateBranding.logoUrl,
        primaryColor: corporateBranding.primaryColor,
      })
      .from(corporateBranding)
      .where(eq(corporateBranding.companyId, companyId))
      .limit(1);

    return row ?? DEFAULT_BRANDING;
  }

  async getBrandingForUser(userId: string) {
    const [userRow] = await this.db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!userRow?.companyId) {
      return DEFAULT_BRANDING;
    }

    return this.getBrandingForCompany(userRow.companyId);
  }
}
