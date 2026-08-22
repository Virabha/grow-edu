import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  skillDemonstrations,
  skillTags,
  skills,
  users,
} from "../database/schema";
import { CreateSkillDto } from "./dto/create-skill.dto";
import { CreateSkillTagDto } from "./dto/create-skill-tag.dto";
import { UpdateSkillDto } from "./dto/update-skill.dto";

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class SkillsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(dto: CreateSkillDto, createdBy: string) {
    const now = this.clock.now();
    try {
      const [row] = await this.db
        .insert(skills)
        .values({
          key: dto.key,
          label: dto.label,
          description: dto.description ?? null,
          requiredItems: dto.requiredItems ?? 1,
          createdBy,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return row;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("skills_organization_key_unique")
      ) {
        throw new ConflictException(`Skill key '${dto.key}' already exists`);
      }
      throw err;
    }
  }

  async list() {
    return this.db
      .select()
      .from(skills)
      .orderBy(skills.key);
  }

  async update(skillId: string, dto: UpdateSkillDto) {
    const now = this.clock.now();
    const [row] = await this.db
      .update(skills)
      .set({
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.requiredItems !== undefined && {
          requiredItems: dto.requiredItems,
        }),
        ...(dto.isRetired !== undefined && { isRetired: dto.isRetired }),
        updatedAt: now,
      })
      .where(eq(skills.skillId, skillId))
      .returning();
    if (!row) throw new NotFoundException(`Skill ${skillId} not found`);
    return row;
  }

  async addTag(skillId: string, dto: CreateSkillTagDto) {
    const [skill] = await this.db
      .select()
      .from(skills)
      .where(eq(skills.skillId, skillId))
      .limit(1);
    if (!skill) throw new NotFoundException(`Skill ${skillId} not found`);

    const now = this.clock.now();
    const [row] = await this.db
      .insert(skillTags)
      .values({
        skillId,
        subjectKind: dto.subjectKind,
        subjectId: dto.subjectId,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  async removeTag(tagId: string) {
    await this.db
      .delete(skillTags)
      .where(eq(skillTags.skillTagId, tagId));
    return { deleted: true };
  }

  async listTags(skillId: string) {
    return this.db
      .select()
      .from(skillTags)
      .where(eq(skillTags.skillId, skillId));
  }

  async myDemonstrations(userId: string) {
    const allSkills = await this.db
      .select()
      .from(skills)
      .where(eq(skills.isRetired, false));

    if (allSkills.length === 0) return [];

    const skillIds = allSkills.map((s) => s.skillId);

    const demos = await this.db
      .select()
      .from(skillDemonstrations)
      .where(
        and(
          eq(skillDemonstrations.userId, userId),
          inArray(skillDemonstrations.skillId, skillIds),
        ),
      );

    const demoMap = new Map(demos.map((d) => [d.skillId, d]));

    return allSkills.map((skill) => {
      const demo = demoMap.get(skill.skillId);
      return {
        skillId: skill.skillId,
        key: skill.key,
        label: skill.label,
        description: skill.description,
        requiredItems: skill.requiredItems,
        completedItems: demo?.completedItems ?? 0,
        demonstrated: demo?.demonstratedAt !== null && demo?.demonstratedAt !== undefined,
        demonstratedAt: demo?.demonstratedAt ?? null,
      };
    });
  }

  async demonstrationsFor(userId: string) {
    return this.db
      .select({
        demonstration: skillDemonstrations,
        user: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(skillDemonstrations)
      .innerJoin(users, eq(skillDemonstrations.userId, users.userId))
      .where(eq(skillDemonstrations.userId, userId));
  }
}
