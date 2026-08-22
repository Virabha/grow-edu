import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CLOCK, Clock } from '../common/clock';
import * as schema from '../database/schema';
import {
  portfolioItems,
  portfolios,
  projectMilestoneProgress,
  projects,
  skillDemonstrations,
  skills,
  batchCertificates,
  pathCertificates,
} from '../database/schema';
import type { UpsertPortfolioDto } from './dto/upsert-portfolio.dto';
import type { PublishItemDto } from './dto/publish-item.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async upsert(userId: string, dto: UpsertPortfolioDto): Promise<void> {
    const now = this.clock.now();
    await this.db
      .insert(portfolios)
      .values({
        userId,
        handle: dto.handle,
        displayName: dto.displayName ?? null,
        headline: dto.headline ?? null,
        bio: dto.bio ?? null,
        isPublished: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: portfolios.userId,
        set: {
          handle: dto.handle,
          displayName: dto.displayName ?? null,
          headline: dto.headline ?? null,
          bio: dto.bio ?? null,
          updatedAt: now,
        },
      });
  }

  async setPublished(userId: string, published: boolean): Promise<void> {
    await this.db
      .update(portfolios)
      .set({ isPublished: published, updatedAt: this.clock.now() })
      .where(eq(portfolios.userId, userId));
  }

  async publishItem(userId: string, dto: PublishItemDto): Promise<{ itemId: string }> {
    const [portfolio] = await this.db
      .select({ portfolioId: portfolios.portfolioId })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);

    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const snapshot = await this.buildSnapshot(userId, dto);
    const now = this.clock.now();

    const [inserted] = await this.db
      .insert(portfolioItems)
      .values({
        portfolioId: portfolio.portfolioId,
        userId,
        kind: dto.kind,
        referenceId: dto.referenceId,
        snapshot,
        publishedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [portfolioItems.portfolioId, portfolioItems.kind, portfolioItems.referenceId],
        set: { snapshot, updatedAt: now },
      })
      .returning({ itemId: portfolioItems.itemId });

    return { itemId: inserted.itemId };
  }

  private async buildSnapshot(
    userId: string,
    dto: PublishItemDto,
  ): Promise<Record<string, unknown>> {
    if (dto.kind === 'PROJECT') {
      return this.buildProjectSnapshot(userId, dto.referenceId);
    }
    if (dto.kind === 'SKILL') {
      return this.buildSkillSnapshot(userId, dto.referenceId);
    }
    return this.buildCertificateSnapshot(userId, dto.referenceId);
  }

  private async buildProjectSnapshot(
    userId: string,
    projectId: string,
  ): Promise<Record<string, unknown>> {
    const [project] = await this.db
      .select({ projectId: projects.projectId, title: projects.title })
      .from(projects)
      .where(and(eq(projects.projectId, projectId), eq(projects.isDeleted, false)))
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');

    const passed = await this.db
      .select({ milestoneId: projectMilestoneProgress.milestoneId })
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.projectId, projectId),
          eq(projectMilestoneProgress.userId, userId),
          eq(projectMilestoneProgress.state, 'PASSED'),
        ),
      );

    if (passed.length === 0) {
      throw new ForbiddenException('No passed milestones for this project');
    }

    return {
      projectId: project.projectId,
      title: project.title,
      completedMilestones: passed.length,
    };
  }

  private async buildSkillSnapshot(
    userId: string,
    skillId: string,
  ): Promise<Record<string, unknown>> {
    const [skill] = await this.db
      .select({
        skillId: skills.skillId,
        key: skills.key,
        label: skills.label,
        description: skills.description,
      })
      .from(skills)
      .where(eq(skills.skillId, skillId))
      .limit(1);

    if (!skill) throw new NotFoundException('Skill not found');

    const [demo] = await this.db
      .select({ demonstratedAt: skillDemonstrations.demonstratedAt })
      .from(skillDemonstrations)
      .where(
        and(
          eq(skillDemonstrations.userId, userId),
          eq(skillDemonstrations.skillId, skillId),
        ),
      )
      .limit(1);

    if (!demo || !demo.demonstratedAt) {
      throw new ForbiddenException('Skill not yet demonstrated');
    }

    return {
      skillId: skill.skillId,
      key: skill.key,
      label: skill.label,
      description: skill.description ?? null,
      demonstratedAt: demo.demonstratedAt.toISOString(),
    };
  }

  private async buildCertificateSnapshot(
    userId: string,
    certificateId: string,
  ): Promise<Record<string, unknown>> {
    const [batchCert] = await this.db
      .select({
        certificateNumber: batchCertificates.certificateNumber,
        verificationCode: batchCertificates.verificationCode,
        issuedAt: batchCertificates.issuedAt,
      })
      .from(batchCertificates)
      .where(
        and(
          eq(batchCertificates.certificateId, certificateId),
          eq(batchCertificates.userId, userId),
          isNull(batchCertificates.revokedAt),
        ),
      )
      .limit(1);

    if (batchCert) {
      return {
        certificateKind: 'BATCH',
        certificateNumber: batchCert.certificateNumber,
        verificationCode: batchCert.verificationCode,
        verifyUrl: `/verify/certificates/${batchCert.verificationCode}`,
        issuedAt: batchCert.issuedAt.toISOString(),
      };
    }

    const [pathCert] = await this.db
      .select({
        certificateNumber: pathCertificates.certificateNumber,
        verificationCode: pathCertificates.verificationCode,
        issuedAt: pathCertificates.issuedAt,
      })
      .from(pathCertificates)
      .where(
        and(
          eq(pathCertificates.certificateId, certificateId),
          eq(pathCertificates.userId, userId),
          isNull(pathCertificates.revokedAt),
        ),
      )
      .limit(1);

    if (pathCert) {
      return {
        certificateKind: 'PATH',
        certificateNumber: pathCert.certificateNumber,
        verificationCode: pathCert.verificationCode,
        verifyUrl: `/verify/certificates/${pathCert.verificationCode}`,
        issuedAt: pathCert.issuedAt.toISOString(),
      };
    }

    throw new ForbiddenException('Certificate not found or does not belong to you');
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const [item] = await this.db
      .select({ userId: portfolioItems.userId })
      .from(portfolioItems)
      .where(eq(portfolioItems.itemId, itemId))
      .limit(1);

    if (!item) throw new NotFoundException('Item not found');
    if (item.userId !== userId) throw new ForbiddenException();

    await this.db.delete(portfolioItems).where(eq(portfolioItems.itemId, itemId));
  }
}
