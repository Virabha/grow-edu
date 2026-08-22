import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  assessmentAttempts,
  assessmentTests,
  diagnosticResults,
  studentProfiles,
} from "../database/schema";
import { CLOCK, Clock } from "../common/clock";
import { DISCOVERY_SETTINGS_GROUP } from "../settings/settings.definitions";
import { SettingsService } from "../settings/settings.service";

interface LevelBand {
  level: string;
  minimumPercent: number;
  meaning: string;
}

@Injectable()
export class DiagnosticService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly settings: SettingsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async testForViewer(userId: string) {
    const goalKey = await this.goalOf(userId);
    if (goalKey === null) {
      throw new BadRequestException(
        "Choose a goal before taking the placement test",
      );
    }
    const testId = await this.testForGoal(goalKey);
    if (testId === null) {
      throw new NotFoundException(
        "No placement test has been set up for that goal yet",
      );
    }
    const [test] = await this.db
      .select({
        testId: assessmentTests.testId,
        title: assessmentTests.title,
        durationMinutes: assessmentTests.durationMinutes,
      })
      .from(assessmentTests)
      .where(
        and(
          eq(assessmentTests.testId, testId),
          eq(assessmentTests.isDeleted, false),
        ),
      );
    if (!test) {
      throw new NotFoundException(
        "No placement test has been set up for that goal yet",
      );
    }
    return { ...test, goalKey };
  }

  async recordResult(userId: string, attemptId: string) {
    const [attempt] = await this.db
      .select()
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.attemptId, attemptId),
          eq(assessmentAttempts.userId, userId),
        ),
      );
    if (!attempt) throw new NotFoundException("No such attempt");
    if (attempt.status !== "GRADED") {
      throw new BadRequestException("That attempt has not been graded yet");
    }

    const goalKey = await this.goalOf(userId);
    const expected = goalKey === null ? null : await this.testForGoal(goalKey);
    if (expected !== attempt.testId) {
      throw new BadRequestException(
        "That attempt is not of the placement test for your goal",
      );
    }

    const bands = await this.levelBands();
    const scored = this.percentOf(attempt.finalScore, attempt.maxScore);
    const band = bandFor(bands, scored);
    const now = this.clock.now();

    await this.db
      .update(diagnosticResults)
      .set({ supersededAt: now })
      .where(
        and(
          eq(diagnosticResults.userId, userId),
          isNull(diagnosticResults.supersededAt),
        ),
      );

    const [recorded] = await this.db
      .insert(diagnosticResults)
      .values({
        userId,
        testId: attempt.testId,
        attemptId,
        goalKey,
        level: band.level,
        recommendation: band.meaning,
        scoredPercent: Math.round(scored),
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: diagnosticResults.attemptId,
        set: {
          level: band.level,
          recommendation: band.meaning,
          scoredPercent: Math.round(scored),
          supersededAt: null,
        },
      })
      .returning();

    await this.storeLevel(userId, band.level, now);

    return {
      level: recorded.level,
      meaning: recorded.recommendation,
      goalKey: recorded.goalKey,
    };
  }

  async currentFor(userId: string) {
    const [current] = await this.db
      .select()
      .from(diagnosticResults)
      .where(
        and(
          eq(diagnosticResults.userId, userId),
          isNull(diagnosticResults.supersededAt),
        ),
      )
      .orderBy(desc(diagnosticResults.createdAt));

    if (!current) {
      return { level: null, meaning: null, goalKey: await this.goalOf(userId) };
    }
    return {
      level: current.level,
      meaning: current.recommendation,
      goalKey: current.goalKey,
    };
  }

  private percentOf(final: string | null, max: string | null): number {
    const scored = Number(final ?? 0);
    const total = Number(max ?? 0);
    if (!Number.isFinite(scored) || !Number.isFinite(total) || total <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (scored / total) * 100));
  }

  private async storeLevel(
    userId: string,
    level: string,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(studentProfiles)
      .values({
        userId,
        level,
        levelSetAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: { level, levelSetAt: now, updatedAt: now },
      });
  }

  private async goalOf(userId: string): Promise<string | null> {
    const [profile] = await this.db
      .select({ goalKey: studentProfiles.goalKey })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId));
    return profile?.goalKey ?? null;
  }

  private async testForGoal(goalKey: string): Promise<string | null> {
    const group = await this.settings.getGroup(DISCOVERY_SETTINGS_GROUP);
    const configured = group.values.diagnosticTests;
    if (typeof configured !== "string") return null;
    for (const line of configured.split("\n")) {
      const [key, testId] = line.split("|").map((part) => part.trim());
      if (key === goalKey && testId) return testId;
    }
    return null;
  }

  private async levelBands(): Promise<LevelBand[]> {
    const group = await this.settings.getGroup(DISCOVERY_SETTINGS_GROUP);
    const configured = group.values.diagnosticLevels;
    const bands: LevelBand[] = [];
    if (typeof configured === "string") {
      for (const line of configured.split("\n")) {
        const [level, minimum, meaning] = line.split("|").map((p) => p.trim());
        const threshold = Number(minimum);
        if (!level || !Number.isFinite(threshold)) continue;
        bands.push({ level, minimumPercent: threshold, meaning: meaning ?? "" });
      }
    }
    if (bands.length === 0) {
      throw new BadRequestException(
        "No placement level bands have been configured",
      );
    }
    return bands.sort((a, b) => a.minimumPercent - b.minimumPercent);
  }
}

function bandFor(bands: LevelBand[], scored: number): LevelBand {
  let chosen = bands[0];
  for (const band of bands) {
    if (scored >= band.minimumPercent) chosen = band;
  }
  return chosen;
}
