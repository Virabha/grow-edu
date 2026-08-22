import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, isNull, isNotNull, lt } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CLOCK, Clock } from '../common/clock';
import { isUniqueViolation } from '../common/unique-violation';
import { JOB_QUEUE, JobQueue, registerAndRepeat } from '../jobs/job-queue';
import { SettingsService } from '../settings/settings.service';
import { ENVIRONMENTS_SETTINGS_GROUP } from '../settings/settings.definitions';
import {
  ENVIRONMENT_PROVIDER,
  EnvironmentProvider,
} from './environment-provider';
import * as schema from '../database/schema';
import {
  devEnvironments,
  devEnvironmentUsage,
  pathStages,
  pathEnrolments,
} from '../database/schema';

export const ENVIRONMENTS_HIBERNATE_JOB = 'environments.hibernate.idle';
export const ENVIRONMENTS_RECLAIM_JOB = 'environments.reclaim.dormant';

const EVERY_FIVE_MINUTES = 5 * 60 * 1000;
const EVERY_HOUR = 60 * 60 * 1000;

type EnvSettings = {
  maxConcurrent: number;
  idleHibernateMs: number;
  dormantReclaimMs: number;
  cpuLimit: number;
  memoryLimitMb: number;
  egressPolicy: string[];
};

type DevEnv = typeof devEnvironments.$inferSelect;

@Injectable()
export class EnvironmentsService implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    @Inject(ENVIRONMENT_PROVIDER)
    private readonly provider: EnvironmentProvider,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      ENVIRONMENTS_HIBERNATE_JOB,
      () => this.hibernateIdle(),
      EVERY_FIVE_MINUTES,
      (err) => this.logger.error('Could not schedule hibernate job', err),
    );
    registerAndRepeat(
      this.jobs,
      ENVIRONMENTS_RECLAIM_JOB,
      () => this.reclaimDormant(),
      EVERY_HOUR,
      (err) => this.logger.error('Could not schedule reclaim job', err),
    );
  }

  async provisionOrResume(userId: string, stageId: string): Promise<DevEnv> {
    const stage = await this.requireProjectStage(stageId);
    await this.requireActiveEnrolment(userId, stage.pathId);

    const existing = await this.findEnvironment(userId, stageId);

    if (existing) {
      return this.handleExistingEnvironment(existing, userId, stage);
    }

    await this.assertBelowConcurrencyLimit(userId);

    const envSettings = await this.readSettings();

    if (envSettings.egressPolicy.length === 0) {
      throw new UnprocessableEntityException(
        'Egress policy is empty — provisioning refused',
      );
    }

    const now = this.clock.now();
    let inserted: DevEnv;
    try {
      const rows = await this.db
        .insert(devEnvironments)
        .values({
          userId,
          pathId: stage.pathId,
          stageId,
          projectId: stage.projectId ?? '',
          cpuLimit: envSettings.cpuLimit,
          memoryLimitMb: envSettings.memoryLimitMb,
          egressPolicy: envSettings.egressPolicy,
          status: 'PROVISIONING',
          lastActiveAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      inserted = rows[0];
    } catch (err) {
      if (isUniqueViolation(err, 'dev_environments_user_stage_unique')) {
        const raced = await this.findEnvironment(userId, stageId);
        if (raced) {
          return this.handleExistingEnvironment(raced, userId, stage);
        }
      }
      throw err;
    }

    try {
      const provisioned = await this.provider.provision({
        userId,
        projectId: stage.projectId ?? '',
        cpuLimit: envSettings.cpuLimit,
        memoryLimitMb: envSettings.memoryLimitMb,
        egressPolicy: envSettings.egressPolicy,
      });

      const [updated] = await this.db
        .update(devEnvironments)
        .set({
          status: 'RUNNING',
          providerRef: provisioned.providerRef,
          workspaceRef: provisioned.workspaceRef,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(devEnvironments.environmentId, inserted.environmentId))
        .returning();

      await this.openUsageSession(updated.environmentId, userId, now);
      return updated;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const [failed] = await this.db
        .update(devEnvironments)
        .set({
          status: 'FAILED',
          failureReason: reason,
          updatedAt: this.clock.now(),
        })
        .where(eq(devEnvironments.environmentId, inserted.environmentId))
        .returning();
      return failed;
    }
  }

  async getForUser(environmentId: string, userId: string): Promise<DevEnv> {
    const [env] = await this.db
      .select()
      .from(devEnvironments)
      .where(eq(devEnvironments.environmentId, environmentId))
      .limit(1);

    if (!env) throw new NotFoundException('Environment not found');
    if (env.userId !== userId) throw new ForbiddenException('Access denied');
    return env;
  }

  async heartbeat(environmentId: string, userId: string): Promise<void> {
    const env = await this.getForUser(environmentId, userId);
    if (env.status !== 'RUNNING') return;
    const now = this.clock.now();
    await this.db
      .update(devEnvironments)
      .set({ lastActiveAt: now, updatedAt: now })
      .where(eq(devEnvironments.environmentId, environmentId));
  }

  async manualHibernate(environmentId: string, userId: string): Promise<void> {
    const env = await this.getForUser(environmentId, userId);
    if (env.status !== 'RUNNING') return;
    await this.hibernateOne(env);
  }

  async getUsageSummary(
    userId: string,
  ): Promise<{ totalRunningSeconds: number; sessions: number }> {
    const rows = await this.db
      .select({ runningSeconds: devEnvironmentUsage.runningSeconds })
      .from(devEnvironmentUsage)
      .where(eq(devEnvironmentUsage.userId, userId));

    const total = rows.reduce((sum, r) => sum + r.runningSeconds, 0);
    return { totalRunningSeconds: total, sessions: rows.length };
  }

  async hibernateIdle(): Promise<void> {
    const envSettings = await this.readSettings();
    const cutoff = new Date(
      this.clock.now().getTime() - envSettings.idleHibernateMs,
    );

    const candidates = await this.db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.status, 'RUNNING'),
          lt(devEnvironments.lastActiveAt, cutoff),
        ),
      );

    for (const env of candidates) {
      try {
        await this.hibernateOne(env);
      } catch (err) {
        this.logger.error(
          `Failed to hibernate environment ${env.environmentId}`,
          err,
        );
      }
    }
  }

  async reclaimDormant(): Promise<void> {
    const envSettings = await this.readSettings();
    const cutoff = new Date(
      this.clock.now().getTime() - envSettings.dormantReclaimMs,
    );

    const candidates = await this.db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.status, 'HIBERNATED'),
          isNotNull(devEnvironments.hibernatedAt),
          lt(devEnvironments.hibernatedAt, cutoff),
        ),
      );

    for (const env of candidates) {
      if (!env.providerRef) continue;
      try {
        await this.provider.reclaim(env.providerRef);
        const now = this.clock.now();
        await this.db
          .update(devEnvironments)
          .set({ status: 'RECLAIMED', reclaimedAt: now, updatedAt: now })
          .where(eq(devEnvironments.environmentId, env.environmentId));
      } catch (err) {
        this.logger.error(
          `Failed to reclaim environment ${env.environmentId}`,
          err,
        );
      }
    }
  }

  private async handleExistingEnvironment(
    env: DevEnv,
    userId: string,
    stage: typeof pathStages.$inferSelect,
  ): Promise<DevEnv> {
    const now = this.clock.now();

    if (env.status === 'RUNNING') {
      const [updated] = await this.db
        .update(devEnvironments)
        .set({ lastActiveAt: now, updatedAt: now })
        .where(eq(devEnvironments.environmentId, env.environmentId))
        .returning();
      return updated;
    }

    if (env.status === 'HIBERNATED' && env.providerRef && env.workspaceRef) {
      const envSettings = await this.readSettings();
      await this.assertBelowConcurrencyLimit(userId, env.environmentId);
      await this.provider.resume({
        providerRef: env.providerRef,
        workspaceRef: env.workspaceRef,
        cpuLimit: envSettings.cpuLimit,
        memoryLimitMb: envSettings.memoryLimitMb,
        egressPolicy: envSettings.egressPolicy,
      });
      const [updated] = await this.db
        .update(devEnvironments)
        .set({
          status: 'RUNNING',
          lastActiveAt: now,
          hibernatedAt: null,
          updatedAt: now,
        })
        .where(eq(devEnvironments.environmentId, env.environmentId))
        .returning();
      await this.openUsageSession(updated.environmentId, userId, now);
      return updated;
    }

    if (env.status === 'RECLAIMED' || env.status === 'FAILED') {
      const envSettings = await this.readSettings();

      if (envSettings.egressPolicy.length === 0) {
        throw new UnprocessableEntityException(
          'Egress policy is empty — provisioning refused',
        );
      }

      await this.assertBelowConcurrencyLimit(userId, env.environmentId);

      const provisioned = await this.provider.provision({
        userId,
        projectId: stage.projectId ?? '',
        cpuLimit: envSettings.cpuLimit,
        memoryLimitMb: envSettings.memoryLimitMb,
        egressPolicy: envSettings.egressPolicy,
        workspaceRef: env.workspaceRef ?? undefined,
      });

      const [updated] = await this.db
        .update(devEnvironments)
        .set({
          status: 'RUNNING',
          providerRef: provisioned.providerRef,
          workspaceRef: provisioned.workspaceRef,
          lastActiveAt: now,
          reclaimedAt: null,
          failureReason: null,
          updatedAt: now,
        })
        .where(eq(devEnvironments.environmentId, env.environmentId))
        .returning();

      await this.openUsageSession(updated.environmentId, userId, now);
      return updated;
    }

    return env;
  }

  private async hibernateOne(env: DevEnv): Promise<void> {
    if (env.providerRef) {
      await this.provider.hibernate(env.providerRef);
    }
    const now = this.clock.now();
    await this.db
      .update(devEnvironments)
      .set({ status: 'HIBERNATED', hibernatedAt: now, updatedAt: now })
      .where(eq(devEnvironments.environmentId, env.environmentId));
    await this.closeUsageSession(env.environmentId, now);
  }

  private async openUsageSession(
    environmentId: string,
    userId: string,
    startedAt: Date,
  ): Promise<void> {
    await this.db.insert(devEnvironmentUsage).values({
      environmentId,
      userId,
      startedAt,
    });
  }

  private async closeUsageSession(
    environmentId: string,
    endedAt: Date,
  ): Promise<void> {
    const [open] = await this.db
      .select()
      .from(devEnvironmentUsage)
      .where(
        and(
          eq(devEnvironmentUsage.environmentId, environmentId),
          isNull(devEnvironmentUsage.endedAt),
        ),
      )
      .limit(1);

    if (!open) return;

    const runningSeconds = Math.floor(
      (endedAt.getTime() - open.startedAt.getTime()) / 1000,
    );

    await this.db
      .update(devEnvironmentUsage)
      .set({ endedAt, runningSeconds })
      .where(eq(devEnvironmentUsage.usageId, open.usageId));
  }

  private async findEnvironment(
    userId: string,
    stageId: string,
  ): Promise<DevEnv | undefined> {
    const [env] = await this.db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.userId, userId),
          eq(devEnvironments.stageId, stageId),
        ),
      )
      .limit(1);
    return env;
  }

  private async requireProjectStage(
    stageId: string,
  ): Promise<typeof pathStages.$inferSelect> {
    const [stage] = await this.db
      .select()
      .from(pathStages)
      .where(eq(pathStages.stageId, stageId))
      .limit(1);

    if (!stage) {
      throw new UnprocessableEntityException('Stage not found');
    }
    if (stage.kind !== 'PROJECT') {
      throw new UnprocessableEntityException(
        'Environments can only be provisioned for PROJECT stages',
      );
    }
    return stage;
  }

  private async requireActiveEnrolment(
    userId: string,
    pathId: string,
  ): Promise<void> {
    const [enrolment] = await this.db
      .select()
      .from(pathEnrolments)
      .where(
        and(
          eq(pathEnrolments.userId, userId),
          eq(pathEnrolments.pathId, pathId),
          eq(pathEnrolments.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (!enrolment) {
      throw new ForbiddenException('You must be actively enrolled in this path');
    }
  }

  private async assertBelowConcurrencyLimit(
    userId: string,
    excludeEnvironmentId?: string,
  ): Promise<void> {
    const envSettings = await this.readSettings();
    const maxConcurrent = envSettings.maxConcurrent;

    const all = await this.db
      .select({ environmentId: devEnvironments.environmentId })
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.userId, userId),
          eq(devEnvironments.status, 'RUNNING'),
        ),
      );

    const running = excludeEnvironmentId
      ? all.filter((r) => r.environmentId !== excludeEnvironmentId)
      : all;

    if (running.length >= maxConcurrent) {
      throw new ConflictException(
        `You already have ${running.length} running environment(s). Maximum is ${maxConcurrent}.`,
      );
    }
  }

  private async readSettings(): Promise<EnvSettings> {
    const group = await this.settings.getGroup(ENVIRONMENTS_SETTINGS_GROUP);
    const v = group.values;

    const maxConcurrent =
      Number.isFinite(Number(v.maxConcurrentPerStudent)) &&
      Number(v.maxConcurrentPerStudent) > 0
        ? Number(v.maxConcurrentPerStudent)
        : 1;

    const idleHibernateMs =
      Number.isFinite(Number(v.idleHibernateMinutes)) &&
      Number(v.idleHibernateMinutes) > 0
        ? Number(v.idleHibernateMinutes) * 60 * 1000
        : 30 * 60 * 1000;

    const dormantReclaimMs =
      Number.isFinite(Number(v.dormantReclaimHours)) &&
      Number(v.dormantReclaimHours) > 0
        ? Number(v.dormantReclaimHours) * 60 * 60 * 1000
        : 168 * 60 * 60 * 1000;

    const cpuLimit =
      Number.isFinite(Number(v.cpuLimit)) && Number(v.cpuLimit) > 0
        ? Number(v.cpuLimit)
        : 2;

    const memoryLimitMb =
      Number.isFinite(Number(v.memoryLimitMb)) && Number(v.memoryLimitMb) > 0
        ? Number(v.memoryLimitMb)
        : 4096;

    const egressPolicy =
      typeof v.egressAllowList === 'string'
        ? v.egressAllowList
            .split('\n')
            .map((h) => h.trim())
            .filter((h) => h.length > 0)
        : [];

    return {
      maxConcurrent,
      idleHibernateMs,
      dormantReclaimMs,
      cpuLimit,
      memoryLimitMb,
      egressPolicy,
    };
  }
}
