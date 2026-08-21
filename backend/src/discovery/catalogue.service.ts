import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batches, studentProfiles } from '../database/schema';
import { DISCOVERY_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import type { CatalogueBatch, CatalogueResponse } from './dto/catalogue-batch.dto';
import type { CatalogueFilterDto } from './dto/catalogue-filter.dto';

const LISTED_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

const PUBLIC_COLUMNS = {
  batchId: batches.batchId,
  title: batches.title,
  slug: batches.slug,
  shortDescription: batches.shortDescription,
  thumbnail: batches.thumbnail,
  price: batches.price,
  currency: batches.currency,
  language: batches.language,
  goalKey: batches.goalKey,
  deliveryMode: batches.deliveryMode,
  startDate: batches.startDate,
  endDate: batches.endDate,
  status: batches.status,
  categoryId: batches.categoryId,
} as const;

@Injectable()
export class CatalogueService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly settings: SettingsService,
  ) {}

  async list(
    filter: CatalogueFilterDto,
    viewer: { userId?: string },
  ): Promise<CatalogueResponse> {
    const group = await this.settings.getGroup(DISCOVERY_SETTINGS_GROUP);
    const pageSize = Number(group.values.cataloguePageSize) || 20;

    let effectiveGoalKey = filter.goalKey ?? null;
    if (!effectiveGoalKey && viewer.userId) {
      const [profile] = await this.db
        .select({ goalKey: studentProfiles.goalKey })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, viewer.userId))
        .limit(1);
      effectiveGoalKey = profile?.goalKey ?? null;
    }

    const conditions = [
      eq(batches.isDeleted, false),
      eq(batches.visibility, 'PUBLIC'),
      inArray(batches.status, [...LISTED_STATUSES]),
    ];

    if (effectiveGoalKey) {
      conditions.push(eq(batches.goalKey, effectiveGoalKey));
    }
    if (filter.language) {
      conditions.push(eq(batches.language, filter.language));
    }
    if (filter.startDate) {
      conditions.push(gte(batches.startDate, new Date(filter.startDate)));
    }

    const where = and(...conditions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? pageSize, 100);
    const offset = (page - 1) * limit;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(batches)
      .where(where);

    const total = totalRow?.total ?? 0;

    const data = await this.db
      .select(PUBLIC_COLUMNS)
      .from(batches)
      .where(where)
      .orderBy(asc(batches.startDate), asc(batches.batchId))
      .limit(limit)
      .offset(offset);

    return { data: data as CatalogueBatch[], page, limit, total };
  }
}
