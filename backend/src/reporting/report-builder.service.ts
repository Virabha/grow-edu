import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { and, eq, gte, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { batchEnrollments, users } from "../database/schema";
import {
  DimensionKey,
  MeasureKey,
  dimensionExpression,
  isDimensionKey,
  isMeasureKey,
  listPalette,
  measureExpression,
} from "./report-palette";

const MAX_ROWS = 1000;

export interface ReportDefinition {
  dimensions: string[];
  measures: string[];
  fromDate?: string;
  toDate?: string;
}

export interface ViewerContext {
  userId: string;
  role: string;
}

@Injectable()
export class ReportBuilderService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  palette() {
    return listPalette();
  }

  private async resolveCompanyId(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    return row?.companyId ?? null;
  }

  async run(definition: ReportDefinition, viewer: ViewerContext): Promise<unknown[]> {
    for (const d of definition.dimensions) {
      if (!isDimensionKey(d)) {
        throw new BadRequestException(`Unknown dimension: ${d}`);
      }
    }
    for (const m of definition.measures) {
      if (!isMeasureKey(m)) {
        throw new BadRequestException(`Unknown measure: ${m}`);
      }
    }

    if (viewer.role !== "PLATFORM_ADMIN" && viewer.role !== "CORPORATE_ADMIN") {
      throw new ForbiddenException("Reports require PLATFORM_ADMIN or CORPORATE_ADMIN");
    }

    const dimKeys = definition.dimensions as DimensionKey[];
    const mKeys = definition.measures as MeasureKey[];

    const selectFields: Record<string, ReturnType<typeof dimensionExpression>> = {};
    for (const d of dimKeys) {
      selectFields[d] = dimensionExpression(d);
    }
    for (const m of mKeys) {
      selectFields[m] = measureExpression(m);
    }

    const conditions = [];

    let needsUserJoin =
      dimKeys.includes("user.company") || mKeys.includes("user.count");

    if (viewer.role === "CORPORATE_ADMIN") {
      const companyId = await this.resolveCompanyId(viewer.userId);
      if (!companyId) {
        throw new ForbiddenException("Corporate admin has no company");
      }
      needsUserJoin = true;
      conditions.push(eq(users.companyId, companyId));
    }

    if (definition.fromDate) {
      conditions.push(
        gte(batchEnrollments.createdAt, new Date(definition.fromDate)),
      );
    }
    if (definition.toDate) {
      conditions.push(
        lte(batchEnrollments.createdAt, new Date(definition.toDate)),
      );
    }

    let base = this.db
      .select(selectFields)
      .from(batchEnrollments)
      .$dynamic();

    if (needsUserJoin) {
      base = base.leftJoin(users, eq(batchEnrollments.userId, users.userId));
    }

    if (conditions.length > 0) {
      base = base.where(and(...conditions));
    }

    if (dimKeys.length > 0) {
      const groupByExprs = dimKeys.map((d) => dimensionExpression(d));
      base = base.groupBy(...groupByExprs);
    }

    base = base.limit(MAX_ROWS);

    return base;
  }
}
