import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batches, batchWishlist } from '../database/schema';

const LISTED_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

@Injectable()
export class WishlistService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async save(userId: string, batchId: string): Promise<void> {
    const [batch] = await this.db
      .select({ batchId: batches.batchId })
      .from(batches)
      .where(
        and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)),
      )
      .limit(1);
    if (!batch) throw new NotFoundException('Batch not found');

    await this.db
      .insert(batchWishlist)
      .values({ userId, batchId, createdAt: this.clock.now() })
      .onConflictDoNothing();
  }

  async remove(userId: string, batchId: string): Promise<void> {
    await this.db
      .delete(batchWishlist)
      .where(
        and(
          eq(batchWishlist.userId, userId),
          eq(batchWishlist.batchId, batchId),
        ),
      );
  }

  async list(userId: string): Promise<{
    batchId: string;
    savedAt: Date;
    title: string;
    slug: string;
    thumbnail: string | null;
    price: string;
  }[]> {
    const wishlistRows = await this.db
      .select({
        batchId: batchWishlist.batchId,
        savedAt: batchWishlist.createdAt,
      })
      .from(batchWishlist)
      .where(eq(batchWishlist.userId, userId));

    if (wishlistRows.length === 0) return [];

    const batchIds = wishlistRows.map((r) => r.batchId);

    const batchRows = await this.db
      .select({
        batchId: batches.batchId,
        title: batches.title,
        slug: batches.slug,
        thumbnail: batches.thumbnail,
        price: batches.price,
      })
      .from(batches)
      .where(
        and(
          inArray(batches.batchId, batchIds),
          eq(batches.isDeleted, false),
          eq(batches.visibility, 'PUBLIC'),
          inArray(batches.status, [...LISTED_STATUSES]),
        ),
      );

    const batchMap = new Map(batchRows.map((b) => [b.batchId, b]));

    return wishlistRows
      .filter((r) => batchMap.has(r.batchId))
      .map((r) => {
        const b = batchMap.get(r.batchId);
        if (!b) return null;
        return {
          batchId: b.batchId,
          savedAt: r.savedAt,
          title: b.title,
          slug: b.slug,
          thumbnail: b.thumbnail,
          price: b.price,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
