import { SQL, sql } from "drizzle-orm";
import { batchEnrollments, batches, users, payments } from "../database/schema";

export type DimensionKey =
  | "enrollment.source"
  | "enrollment.month"
  | "batch.id"
  | "batch.title"
  | "user.company"
  | "payment.gateway";

export type MeasureKey =
  | "enrollment.count"
  | "revenue.sum"
  | "revenue.avg"
  | "user.count";

const DIMENSION_EXPRESSIONS: Record<DimensionKey, SQL> = {
  "enrollment.source": sql`${batchEnrollments.source}`,
  "enrollment.month": sql`to_char(date_trunc('month', ${batchEnrollments.createdAt}), 'YYYY-MM')`,
  "batch.id": sql`${batchEnrollments.batchId}`,
  "batch.title": sql`${batches.title}`,
  "user.company": sql`${users.companyId}`,
  "payment.gateway": sql`${payments.gateway}`,
};

const MEASURE_EXPRESSIONS: Record<MeasureKey, SQL> = {
  "enrollment.count": sql`count(distinct ${batchEnrollments.userId})::int`,
  "revenue.sum": sql`coalesce(sum(${payments.amount}::numeric), 0)`,
  "revenue.avg": sql`coalesce(avg(${payments.amount}::numeric), 0)`,
  "user.count": sql`count(distinct ${users.userId})::int`,
};

const ALL_DIMENSION_KEYS = new Set<string>(Object.keys(DIMENSION_EXPRESSIONS));
const ALL_MEASURE_KEYS = new Set<string>(Object.keys(MEASURE_EXPRESSIONS));

export function isDimensionKey(key: string): key is DimensionKey {
  return ALL_DIMENSION_KEYS.has(key);
}

export function isMeasureKey(key: string): key is MeasureKey {
  return ALL_MEASURE_KEYS.has(key);
}

export function dimensionExpression(key: DimensionKey): SQL {
  return DIMENSION_EXPRESSIONS[key];
}

export function measureExpression(key: MeasureKey): SQL {
  return MEASURE_EXPRESSIONS[key];
}

export function listPalette(): { dimensions: DimensionKey[]; measures: MeasureKey[] } {
  return {
    dimensions: Object.keys(DIMENSION_EXPRESSIONS) as DimensionKey[],
    measures: Object.keys(MEASURE_EXPRESSIONS) as MeasureKey[],
  };
}
