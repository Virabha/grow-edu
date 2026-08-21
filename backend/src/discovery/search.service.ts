import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { searchDocuments } from '../database/schema';
import type { SearchQueryDto } from './dto/search-query.dto';

export type SearchResult = {
  kind: string;
  referenceId: string;
  title: string;
  rank: number;
};

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async search(dto: SearchQueryDto): Promise<SearchResult[]> {
    const q = dto.q.trim();
    if (!q) {
      return [];
    }

    const conditions = [
      eq(searchDocuments.isListed, true),
      sql`${searchDocuments.searchVector} @@ plainto_tsquery('english', ${q})`,
    ];

    if (dto.kind) {
      conditions.push(eq(searchDocuments.kind, dto.kind));
    }

    const rows = await this.db
      .select({
        kind: searchDocuments.kind,
        referenceId: searchDocuments.referenceId,
        title: searchDocuments.title,
        rank: sql<number>`ts_rank(${searchDocuments.searchVector}, plainto_tsquery('english', ${q}))`,
      })
      .from(searchDocuments)
      .where(and(...conditions))
      .orderBy(
        desc(
          sql`ts_rank(${searchDocuments.searchVector}, plainto_tsquery('english', ${q}))`,
        ),
      )
      .limit(50);

    return rows as SearchResult[];
  }
}
