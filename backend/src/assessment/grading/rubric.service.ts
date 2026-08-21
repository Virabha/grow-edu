import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentRubricCriteria,
  assessmentRubrics,
  assessmentTestQuestions,
} from "../../database/schema";
import {
  AddCriterionDto,
  AttachRubricDto,
  CreateRubricDto,
  UpdateCriterionDto,
  UpdateRubricDto,
} from "./dto/rubric.dto";

@Injectable()
export class RubricService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createRubric(dto: CreateRubricDto, createdBy: string) {
    const now = this.clock.now();
    const [rubric] = await this.db
      .insert(assessmentRubrics)
      .values({
        title: dto.title,
        scaleMax: dto.scaleMax,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return this.getRubric(rubric.rubricId);
  }

  async getRubric(rubricId: string) {
    const [rubric] = await this.db
      .select()
      .from(assessmentRubrics)
      .where(
        and(
          eq(assessmentRubrics.rubricId, rubricId),
          eq(assessmentRubrics.isRetired, false),
        ),
      )
      .limit(1);
    if (!rubric) throw new NotFoundException("Rubric not found");

    const criteria = await this.db
      .select()
      .from(assessmentRubricCriteria)
      .where(eq(assessmentRubricCriteria.rubricId, rubricId))
      .orderBy(asc(assessmentRubricCriteria.order));

    return { ...rubric, criteria };
  }

  async updateRubric(rubricId: string, dto: UpdateRubricDto) {
    const existing = await this.requireRubric(rubricId);
    const updates: Partial<typeof assessmentRubrics.$inferInsert> = {
      updatedAt: this.clock.now(),
    };
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.scaleMax !== undefined) updates.scaleMax = dto.scaleMax;

    await this.db
      .update(assessmentRubrics)
      .set(updates)
      .where(eq(assessmentRubrics.rubricId, rubricId));

    return this.getRubric(existing.rubricId);
  }

  async addCriterion(rubricId: string, dto: AddCriterionDto) {
    await this.requireRubric(rubricId);
    const now = this.clock.now();

    const existing = await this.db
      .select()
      .from(assessmentRubricCriteria)
      .where(eq(assessmentRubricCriteria.rubricId, rubricId));

    const order = dto.order ?? existing.length;

    await this.db.insert(assessmentRubricCriteria).values({
      rubricId,
      label: dto.label,
      weight: dto.weight.toString(),
      order,
      createdAt: now,
    });

    return this.getRubric(rubricId);
  }

  async updateCriterion(
    rubricId: string,
    criterionId: string,
    dto: UpdateCriterionDto,
  ) {
    await this.requireRubric(rubricId);
    const [criterion] = await this.db
      .select()
      .from(assessmentRubricCriteria)
      .where(
        and(
          eq(assessmentRubricCriteria.criterionId, criterionId),
          eq(assessmentRubricCriteria.rubricId, rubricId),
        ),
      )
      .limit(1);

    if (!criterion) throw new NotFoundException("Criterion not found");

    const updates: Partial<typeof assessmentRubricCriteria.$inferInsert> = {};
    if (dto.label !== undefined) updates.label = dto.label;
    if (dto.weight !== undefined) updates.weight = dto.weight.toString();
    if (dto.order !== undefined) updates.order = dto.order;

    await this.db
      .update(assessmentRubricCriteria)
      .set(updates)
      .where(eq(assessmentRubricCriteria.criterionId, criterionId));

    return this.getRubric(rubricId);
  }

  async removeCriterion(rubricId: string, criterionId: string) {
    await this.requireRubric(rubricId);
    const [criterion] = await this.db
      .select()
      .from(assessmentRubricCriteria)
      .where(
        and(
          eq(assessmentRubricCriteria.criterionId, criterionId),
          eq(assessmentRubricCriteria.rubricId, rubricId),
        ),
      )
      .limit(1);

    if (!criterion) throw new NotFoundException("Criterion not found");

    await this.db
      .delete(assessmentRubricCriteria)
      .where(eq(assessmentRubricCriteria.criterionId, criterionId));

    return this.getRubric(rubricId);
  }

  async attachRubricToPlacement(placementId: string, dto: AttachRubricDto) {
    const [placement] = await this.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.placementId, placementId))
      .limit(1);

    if (!placement) throw new NotFoundException("Placement not found");

    const rubric = await this.getRubric(dto.rubricId);
    const criteria = rubric.criteria;

    const totalWeight = criteria.reduce(
      (sum, c) => sum + Number(c.weight),
      0,
    );

    if (criteria.length > 0 && totalWeight > Number(placement.marks)) {
      throw new ConflictException(
        "Rubric total weight exceeds the placement's marks",
      );
    }

    await this.db
      .update(assessmentTestQuestions)
      .set({ rubricId: dto.rubricId })
      .where(eq(assessmentTestQuestions.placementId, placementId));

    return { placementId, rubricId: dto.rubricId };
  }

  async validateCriterionValue(rubricId: string, value: number): Promise<void> {
    const [rubric] = await this.db
      .select()
      .from(assessmentRubrics)
      .where(eq(assessmentRubrics.rubricId, rubricId))
      .limit(1);

    if (!rubric) throw new NotFoundException("Rubric not found");

    if (value < 0 || value > rubric.scaleMax) {
      throw new BadRequestException(
        `Criterion value must be between 0 and ${rubric.scaleMax}`,
      );
    }
  }

  async getCriteriaForRubric(rubricId: string) {
    return this.db
      .select()
      .from(assessmentRubricCriteria)
      .where(eq(assessmentRubricCriteria.rubricId, rubricId))
      .orderBy(asc(assessmentRubricCriteria.order));
  }

  async getRubricsForPlacements(placementIds: string[]) {
    if (placementIds.length === 0) return new Map<string, string>();

    const placements = await this.db
      .select({
        placementId: assessmentTestQuestions.placementId,
        rubricId: assessmentTestQuestions.rubricId,
      })
      .from(assessmentTestQuestions)
      .where(inArray(assessmentTestQuestions.placementId, placementIds));

    return new Map(
      placements
        .filter((p): p is { placementId: string; rubricId: string } =>
          p.rubricId !== null,
        )
        .map((p) => [p.placementId, p.rubricId]),
    );
  }

  private async requireRubric(rubricId: string) {
    const [rubric] = await this.db
      .select()
      .from(assessmentRubrics)
      .where(
        and(
          eq(assessmentRubrics.rubricId, rubricId),
          eq(assessmentRubrics.isRetired, false),
        ),
      )
      .limit(1);
    if (!rubric) throw new NotFoundException("Rubric not found");
    return rubric;
  }
}
