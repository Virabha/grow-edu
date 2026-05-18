import { Injectable, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { newsletterSubscribers } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreateSubscribeDto } from './dto/create-subscribe.dto';

@Injectable()
export class SubscribeService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(dto: CreateSubscribeDto) {
    const [existing] = await this.db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, dto.email))
      .limit(1);

    if (existing) {
      if (existing.isActive) {
        return { message: 'Already subscribed', email: existing.email };
      }
      const [row] = await this.db
        .update(newsletterSubscribers)
        .set({ isActive: true, subscribedAt: new Date() })
        .where(eq(newsletterSubscribers.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await this.db
      .insert(newsletterSubscribers)
      .values({ email: dto.email })
      .returning();
    return row;
  }
}
