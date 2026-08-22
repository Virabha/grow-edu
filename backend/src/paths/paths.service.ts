import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { learningPaths } from '../database/schema';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';

@Injectable()
export class PathsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(dto: CreatePathDto, createdBy: string) {
    const now = this.clock.now();
    const [path] = await this.db
      .insert(learningPaths)
      .values({
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return path;
  }

  async list() {
    return this.db
      .select()
      .from(learningPaths)
      .where(eq(learningPaths.isDeleted, false));
  }

  async findOne(pathId: string) {
    const [path] = await this.db
      .select()
      .from(learningPaths)
      .where(and(eq(learningPaths.pathId, pathId), eq(learningPaths.isDeleted, false)))
      .limit(1);
    if (!path) {
      throw new NotFoundException({ code: 'PATH_NOT_FOUND', message: 'Path not found' });
    }
    return path;
  }

  async update(pathId: string, dto: UpdatePathDto) {
    await this.findOne(pathId);
    const [updated] = await this.db
      .update(learningPaths)
      .set({ ...dto, updatedAt: this.clock.now() })
      .where(eq(learningPaths.pathId, pathId))
      .returning();
    return updated;
  }
}
