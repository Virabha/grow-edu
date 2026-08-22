import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { corporateApiCredentials } from "../../database/schema";

interface RequestWithApiCompany {
  headers: Record<string, string | undefined>;
  apiCompanyId?: string;
}

@Injectable()
export class ApiCredentialGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithApiCompany>();

    const authorization = request.headers["authorization"];
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException("API credential required");
    }

    const key = authorization.slice(7);
    const keyHash = createHash("sha256").update(key).digest("hex");

    const [credential] = await this.db
      .select({ companyId: corporateApiCredentials.companyId })
      .from(corporateApiCredentials)
      .where(
        and(
          eq(corporateApiCredentials.keyHash, keyHash),
          isNull(corporateApiCredentials.revokedAt),
        )
      )
      .limit(1);

    if (!credential) {
      throw new UnauthorizedException("Invalid or revoked API credential");
    }

    request.apiCompanyId = credential.companyId;
    return true;
  }
}
