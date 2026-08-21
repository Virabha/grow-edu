import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchEnrollments, batches } from "../../database/schema";
import { Queryable, Transaction } from "../../database/transaction";

export interface BatchCapacity {
  capacity: number | null;
  active: number;
  free: number | null;
}

@Injectable()
export class BatchCapacityService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async of(batchId: string, tx?: Queryable): Promise<BatchCapacity> {
    const db = tx ?? this.db;

    const [batch] = await db
      .select({ capacity: batches.capacity })
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    if (!batch) throw new NotFoundException("Batch not found");

    const [taken] = await db
      .select({ active: sql<number>`count(*)::int` })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );

    const active = Number(taken?.active ?? 0);
    return {
      capacity: batch.capacity,
      active,
      free:
        batch.capacity === null ? null : Math.max(batch.capacity - active, 0),
    };
  }

  async hasRoom(batchId: string, tx?: Queryable): Promise<boolean> {
    const { free } = await this.of(batchId, tx);
    return free === null || free > 0;
  }

  async lock(tx: Transaction, batchId: string): Promise<void> {
    const locked = await tx.execute<{ batch_id: string }>(
      sql`select batch_id from batches
          where batch_id = ${batchId} and is_deleted = false
          for update`,
    );
    if (!locked[0]) throw new NotFoundException("Batch not found");
  }
}
