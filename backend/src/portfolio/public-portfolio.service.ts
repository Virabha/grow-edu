import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { portfolioItems, portfolios } from '../database/schema';
import type { PublicPortfolio } from './portfolio-projection';

@Injectable()
export class PublicPortfolioService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getByHandle(handle: string): Promise<PublicPortfolio | null> {
    const [portfolio] = await this.db
      .select({
        portfolioId: portfolios.portfolioId,
        handle: portfolios.handle,
        displayName: portfolios.displayName,
        headline: portfolios.headline,
        bio: portfolios.bio,
        isPublished: portfolios.isPublished,
      })
      .from(portfolios)
      .where(eq(portfolios.handle, handle))
      .limit(1);

    if (!portfolio || !portfolio.isPublished) return null;

    const items = await this.db
      .select({
        kind: portfolioItems.kind,
        publishedAt: portfolioItems.publishedAt,
        snapshot: portfolioItems.snapshot,
      })
      .from(portfolioItems)
      .where(eq(portfolioItems.portfolioId, portfolio.portfolioId))
      .orderBy(asc(portfolioItems.publishedAt));

    return {
      handle: portfolio.handle,
      displayName: portfolio.displayName,
      headline: portfolio.headline,
      bio: portfolio.bio,
      items: items.map((item) => ({
        kind: item.kind,
        publishedAt: item.publishedAt,
        snapshot: item.snapshot,
      })),
    };
  }
}
