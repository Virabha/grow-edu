import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batches } from "../../database/schema";

interface AuthedRequest {
  user?: { userId: string; role: string };
  params?: Record<string, string | undefined>;
}

/** Allows PLATFORM_ADMIN, or INSTRUCTOR listed on the batch's `teacherIds`. */
@Injectable()
export class BatchManagerGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }
    if (user.role === "PLATFORM_ADMIN") return true;
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("You can't manage this batch");
    }

    const batchId = req.params?.batchId;
    if (!batchId) {
      throw new ForbiddenException("Batch identifier missing");
    }
    const [batch] = await this.db
      .select({ teacherIds: batches.teacherIds, isDeleted: batches.isDeleted })
      .from(batches)
      .where(eq(batches.batchId, batchId))
      .limit(1);
    if (!batch || batch.isDeleted) {
      throw new ForbiddenException("Batch not found");
    }
    const teacherIds = Array.isArray(batch.teacherIds)
      ? (batch.teacherIds as string[])
      : [];
    if (teacherIds.includes(user.userId)) return true;
    throw new ForbiddenException("You're not a teacher on this batch");
  }
}
