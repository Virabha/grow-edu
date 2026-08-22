import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { pathStagePrerequisites, pathStages } from '../database/schema';
import { AddPrerequisiteDto } from './dto/add-prerequisite.dto';
import { AddStageDto } from './dto/add-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class PathStagesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async addStage(pathId: string, dto: AddStageDto) {
    const now = this.clock.now();
    const [stage] = await this.db
      .insert(pathStages)
      .values({
        pathId,
        ordinal: dto.ordinal,
        kind: dto.kind as 'BATCH' | 'PROBLEM_SET' | 'PROJECT',
        title: dto.title,
        batchId: dto.batchId ?? null,
        problemSetId: dto.problemSetId ?? null,
        projectId: dto.projectId ?? null,
        isCapstone: dto.isCapstone ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return stage;
  }

  async listStages(pathId: string) {
    return this.db
      .select()
      .from(pathStages)
      .where(and(eq(pathStages.pathId, pathId), eq(pathStages.isDeleted, false)))
      .orderBy(asc(pathStages.ordinal));
  }

  async updateStage(pathId: string, stageId: string, dto: UpdateStageDto) {
    const [stage] = await this.db
      .update(pathStages)
      .set({ ...dto, updatedAt: this.clock.now() })
      .where(and(eq(pathStages.stageId, stageId), eq(pathStages.pathId, pathId), eq(pathStages.isDeleted, false)))
      .returning();
    if (!stage) {
      throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Stage not found' });
    }
    return stage;
  }

  async deleteStage(pathId: string, stageId: string) {
    const [stage] = await this.db
      .update(pathStages)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(and(eq(pathStages.stageId, stageId), eq(pathStages.pathId, pathId)))
      .returning();
    if (!stage) {
      throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Stage not found' });
    }
    return { deleted: true };
  }

  async reorderStages(pathId: string, dto: ReorderStagesDto) {
    const now = this.clock.now();
    const OFFSET = 100_000;
    for (const item of dto.stages) {
      await this.db
        .update(pathStages)
        .set({ ordinal: item.ordinal + OFFSET, updatedAt: now })
        .where(and(eq(pathStages.stageId, item.stageId), eq(pathStages.pathId, pathId)));
    }
    for (const item of dto.stages) {
      await this.db
        .update(pathStages)
        .set({ ordinal: item.ordinal, updatedAt: now })
        .where(and(eq(pathStages.stageId, item.stageId), eq(pathStages.pathId, pathId)));
    }
    return this.listStages(pathId);
  }

  async addPrerequisite(pathId: string, stageId: string, dto: AddPrerequisiteDto) {
    const [stage] = await this.db
      .select()
      .from(pathStages)
      .where(and(eq(pathStages.stageId, stageId), eq(pathStages.pathId, pathId), eq(pathStages.isDeleted, false)))
      .limit(1);
    if (!stage) {
      throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Stage not found' });
    }

    const [reqStage] = await this.db
      .select()
      .from(pathStages)
      .where(and(eq(pathStages.stageId, dto.requiredStageId), eq(pathStages.pathId, pathId), eq(pathStages.isDeleted, false)))
      .limit(1);
    if (!reqStage) {
      throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Required stage not found' });
    }

    if (stageId === dto.requiredStageId) {
      throw new BadRequestException({ code: 'PREREQUISITE_CYCLE', message: 'A stage cannot require itself' });
    }

    const hasCycle = await this.detectCycle(pathId, stageId, dto.requiredStageId);
    if (hasCycle) {
      throw new BadRequestException({ code: 'PREREQUISITE_CYCLE', message: 'Adding this prerequisite would create a cycle' });
    }

    const [prereq] = await this.db
      .insert(pathStagePrerequisites)
      .values({
        pathId,
        stageId,
        requiredStageId: dto.requiredStageId,
      })
      .returning();
    return prereq;
  }

  async removePrerequisite(pathId: string, stageId: string, requiredStageId: string) {
    const result = await this.db
      .delete(pathStagePrerequisites)
      .where(and(
        eq(pathStagePrerequisites.pathId, pathId),
        eq(pathStagePrerequisites.stageId, stageId),
        eq(pathStagePrerequisites.requiredStageId, requiredStageId),
      ))
      .returning();
    if (result.length === 0) {
      throw new NotFoundException({ code: 'PREREQUISITE_NOT_FOUND', message: 'Prerequisite not found' });
    }
    return { deleted: true };
  }

  async listPrerequisites(pathId: string, stageId: string) {
    return this.db
      .select()
      .from(pathStagePrerequisites)
      .where(and(
        eq(pathStagePrerequisites.pathId, pathId),
        eq(pathStagePrerequisites.stageId, stageId),
      ));
  }

  private async detectCycle(pathId: string, stageId: string, requiredStageId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue: string[] = [requiredStageId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      if (current === stageId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const deps = await this.db
        .select({ requiredStageId: pathStagePrerequisites.requiredStageId })
        .from(pathStagePrerequisites)
        .where(and(
          eq(pathStagePrerequisites.pathId, pathId),
          eq(pathStagePrerequisites.stageId, current),
        ));

      for (const dep of deps) {
        if (!visited.has(dep.requiredStageId)) {
          queue.push(dep.requiredStageId);
        }
      }
    }

    return false;
  }
}
