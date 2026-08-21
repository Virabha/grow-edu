import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { studentProfiles } from '../database/schema';
import { DISCOVERY_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class GoalService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly settings: SettingsService,
  ) {}

  async getGoalOptions(): Promise<{ key: string; label: string }[]> {
    const group = await this.settings.getGroup(DISCOVERY_SETTINGS_GROUP);
    const raw = String(group.values.goalOptions ?? '');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('|'))
      .map((line) => {
        const pipeIndex = line.indexOf('|');
        return {
          key: line.slice(0, pipeIndex).trim(),
          label: line.slice(pipeIndex + 1).trim(),
        };
      });
  }

  async getStudentGoal(userId: string): Promise<{ goalKey: string | null }> {
    const [row] = await this.db
      .select({ goalKey: studentProfiles.goalKey })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);
    return { goalKey: row?.goalKey ?? null };
  }

  async setGoal(userId: string, goalKey: string): Promise<void> {
    const options = await this.getGoalOptions();
    const valid = options.some((o) => o.key === goalKey);
    if (!valid) {
      throw new BadRequestException(`"${goalKey}" is not a recognised goal`);
    }

    const now = this.clock.now();
    await this.db
      .insert(studentProfiles)
      .values({
        userId,
        goalKey,
        goalSetAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: { goalKey, goalSetAt: now, updatedAt: now },
      });
  }
}
