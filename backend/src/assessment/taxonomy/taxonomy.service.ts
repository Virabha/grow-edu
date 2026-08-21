import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentDifficultyLevels,
  assessmentQuestions,
  assessmentTaxonomyNodes,
} from "../../database/schema";
import { Queryable } from "../../database/transaction";
import {
  CreateTaxonomyNodeDto,
  DifficultyLevelDto,
  ListTaxonomyNodesDto,
  TaxonomyKind,
  UpdateTaxonomyNodeDto,
} from "./dto/taxonomy.dto";

const PARENT_OF: Record<TaxonomyKind, TaxonomyKind | null> = {
  SUBJECT: null,
  TOPIC: "SUBJECT",
  SUB_TOPIC: "TOPIC",
};

export type TaxonomyNode = typeof assessmentTaxonomyNodes.$inferSelect;

export interface TaxonomyNodeView {
  nodeId: string;
  kind: TaxonomyKind;
  parentId: string | null;
  name: string;
  isRetired: boolean;
}

export interface TaxonomyTreeNode extends TaxonomyNodeView {
  children: TaxonomyTreeNode[];
}

export interface NodeNameEntry {
  nodeId: string;
  parentId: string | null;
}

export interface ActiveNodeNameIndex {
  subjects: Map<string, string>;
  topicsByName: Map<string, NodeNameEntry[]>;
  subTopicsByName: Map<string, NodeNameEntry[]>;
}

@Injectable()
export class TaxonomyService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly auditLog: AuditLogService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(
    dto: CreateTaxonomyNodeDto,
    actorId: string,
  ): Promise<TaxonomyNodeView> {
    const expectedParentKind = PARENT_OF[dto.kind];

    if (expectedParentKind === null) {
      if (dto.parentId) {
        throw new BadRequestException("A SUBJECT cannot have a parent");
      }
    } else {
      if (!dto.parentId) {
        throw new BadRequestException(
          `A ${dto.kind} needs a ${expectedParentKind} parent`,
        );
      }
      const parent = await this.require(dto.parentId);
      if (parent.kind !== expectedParentKind) {
        throw new BadRequestException(
          `A ${dto.kind} must sit under a ${expectedParentKind}`,
        );
      }
      if (parent.isRetired) {
        throw new ConflictException("Cannot add under a retired node");
      }
    }

    const now = this.clock.now();
    const [created] = await this.db
      .insert(assessmentTaxonomyNodes)
      .values({
        kind: dto.kind,
        parentId: dto.parentId ?? null,
        name: dto.name,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.present(created);
  }

  async list(query: ListTaxonomyNodesDto): Promise<TaxonomyNodeView[]> {
    const filters = [];
    if (query.kind) filters.push(eq(assessmentTaxonomyNodes.kind, query.kind));
    if (query.parentId) {
      filters.push(eq(assessmentTaxonomyNodes.parentId, query.parentId));
    }
    if (!query.includeRetired) {
      filters.push(eq(assessmentTaxonomyNodes.isRetired, false));
    }

    const rows = await this.db
      .select()
      .from(assessmentTaxonomyNodes)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(assessmentTaxonomyNodes.name));

    return rows.map((row) => this.present(row));
  }

  async tree(includeRetired: boolean): Promise<TaxonomyTreeNode[]> {
    const rows = await this.db
      .select()
      .from(assessmentTaxonomyNodes)
      .where(
        includeRetired
          ? undefined
          : eq(assessmentTaxonomyNodes.isRetired, false),
      )
      .orderBy(asc(assessmentTaxonomyNodes.name));

    const byId = new Map<string, TaxonomyTreeNode>();
    for (const row of rows) {
      byId.set(row.nodeId, { ...this.present(row), children: [] });
    }

    const roots: TaxonomyTreeNode[] = [];
    for (const row of rows) {
      const node = byId.get(row.nodeId);
      if (!node) continue;
      const parent = row.parentId ? byId.get(row.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return roots;
  }

  async rename(
    nodeId: string,
    dto: UpdateTaxonomyNodeDto,
  ): Promise<TaxonomyNodeView> {
    const existing = await this.require(nodeId);

    const [updated] = await this.db
      .update(assessmentTaxonomyNodes)
      .set({ name: dto.name, updatedAt: this.clock.now() })
      .where(eq(assessmentTaxonomyNodes.nodeId, nodeId))
      .returning();

    await this.auditLog.record({
      action: "assessment.taxonomy.rename",
      targetType: "assessmentTaxonomyNode",
      targetId: nodeId,
      before: { name: existing.name },
      after: { name: dto.name },
    });

    return this.present(updated);
  }

  async retire(nodeId: string): Promise<{ retired: number }> {
    const node = await this.require(nodeId);
    if (node.isRetired) return { retired: 0 };

    const ids = await this.subtreeIds(nodeId);
    const now = this.clock.now();

    await this.db
      .update(assessmentTaxonomyNodes)
      .set({ isRetired: true, retiredAt: now, updatedAt: now })
      .where(inArray(assessmentTaxonomyNodes.nodeId, ids));

    await this.auditLog.record({
      action: "assessment.taxonomy.retire",
      targetType: "assessmentTaxonomyNode",
      targetId: nodeId,
      after: { retiredNodeIds: ids },
    });

    return { retired: ids.length };
  }

  async remove(nodeId: string): Promise<{ deleted: number }> {
    await this.require(nodeId);
    const ids = await this.subtreeIds(nodeId);

    const [tagged] = await this.db
      .select({ questionId: assessmentQuestions.questionId })
      .from(assessmentQuestions)
      .where(
        or(
          inArray(assessmentQuestions.subjectId, ids),
          inArray(assessmentQuestions.topicId, ids),
          inArray(assessmentQuestions.subTopicId, ids),
        ),
      )
      .limit(1);

    if (tagged) {
      throw new ConflictException(
        "This node has questions tagged to it. Retire it instead of deleting it.",
      );
    }

    await this.db
      .delete(assessmentTaxonomyNodes)
      .where(inArray(assessmentTaxonomyNodes.nodeId, ids));

    await this.auditLog.record({
      action: "assessment.taxonomy.delete",
      targetType: "assessmentTaxonomyNode",
      targetId: nodeId,
      before: { deletedNodeIds: ids },
    });

    return { deleted: ids.length };
  }

  async difficultyScale(): Promise<DifficultyLevelDto[]> {
    const rows = await this.db
      .select()
      .from(assessmentDifficultyLevels)
      .orderBy(asc(assessmentDifficultyLevels.ordinal));

    return rows.map((row) => ({ ordinal: row.ordinal, label: row.label }));
  }

  async replaceDifficultyScale(
    levels: DifficultyLevelDto[],
  ): Promise<DifficultyLevelDto[]> {
    const ordinals = new Set(levels.map((level) => level.ordinal));
    if (ordinals.size !== levels.length) {
      throw new BadRequestException("Difficulty ordinals must be distinct");
    }

    const inUse = await this.difficultyOrdinalsInUse();
    const missing = inUse.filter((ordinal) => !ordinals.has(ordinal));
    if (missing.length > 0) {
      throw new ConflictException(
        `Questions are tagged at difficulty ${missing.join(", ")}`,
      );
    }

    const now = this.clock.now();

    await this.db.transaction(async (tx) => {
      await tx.delete(assessmentDifficultyLevels);
      await tx.insert(assessmentDifficultyLevels).values(
        levels.map((level) => ({
          ordinal: level.ordinal,
          label: level.label,
          createdAt: now,
          updatedAt: now,
        })),
      );
    });

    return this.difficultyScale();
  }

  async assertTagsExist(
    tags: { subjectId: string; topicId: string; subTopicId?: string | null },
    tx: Queryable = this.db,
  ): Promise<void> {
    const subject = await this.node(tags.subjectId, tx);
    if (!subject || subject.kind !== "SUBJECT") {
      throw new BadRequestException("subjectId is not a subject");
    }

    const topic = await this.node(tags.topicId, tx);
    if (!topic || topic.kind !== "TOPIC") {
      throw new BadRequestException("topicId is not a topic");
    }
    if (topic.parentId !== subject.nodeId) {
      throw new BadRequestException("topicId does not sit under subjectId");
    }

    if (!tags.subTopicId) return;

    const subTopic = await this.node(tags.subTopicId, tx);
    if (!subTopic || subTopic.kind !== "SUB_TOPIC") {
      throw new BadRequestException("subTopicId is not a sub-topic");
    }
    if (subTopic.parentId !== topic.nodeId) {
      throw new BadRequestException("subTopicId does not sit under topicId");
    }
  }

  async assertDifficultyExists(
    ordinal: number,
    tx: Queryable = this.db,
  ): Promise<void> {
    const [level] = await tx
      .select({ ordinal: assessmentDifficultyLevels.ordinal })
      .from(assessmentDifficultyLevels)
      .where(eq(assessmentDifficultyLevels.ordinal, ordinal))
      .limit(1);

    if (!level) {
      throw new BadRequestException(
        `Difficulty ${ordinal} is not on the configured scale`,
      );
    }
  }

  async descendantsOf(topicId: string): Promise<string[]> {
    return this.subtreeIds(topicId);
  }

  async hierarchy(): Promise<{
    parentOf: Map<string, string | null>;
    nameOf: Map<string, string>;
  }> {
    const rows = await this.db.select().from(assessmentTaxonomyNodes);
    const parentOf = new Map<string, string | null>();
    const nameOf = new Map<string, string>();
    for (const row of rows) {
      parentOf.set(row.nodeId, row.parentId);
      nameOf.set(row.nodeId, row.name);
    }
    return { parentOf, nameOf };
  }

  async namesForIds(nodeIds: string[]): Promise<Map<string, string>> {
    if (nodeIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(assessmentTaxonomyNodes)
      .where(inArray(assessmentTaxonomyNodes.nodeId, nodeIds));
    const nameOf = new Map<string, string>();
    for (const row of rows) nameOf.set(row.nodeId, row.name);
    return nameOf;
  }

  async activeNodeNameIndex(): Promise<ActiveNodeNameIndex> {
    const rows = await this.db
      .select()
      .from(assessmentTaxonomyNodes)
      .where(eq(assessmentTaxonomyNodes.isRetired, false));

    const subjects = new Map<string, string>();
    const topicsByName = new Map<string, NodeNameEntry[]>();
    const subTopicsByName = new Map<string, NodeNameEntry[]>();

    for (const row of rows) {
      if (row.kind === "SUBJECT") {
        subjects.set(row.name, row.nodeId);
      } else if (row.kind === "TOPIC") {
        const arr = topicsByName.get(row.name) ?? [];
        arr.push({ nodeId: row.nodeId, parentId: row.parentId });
        topicsByName.set(row.name, arr);
      } else if (row.kind === "SUB_TOPIC") {
        const arr = subTopicsByName.get(row.name) ?? [];
        arr.push({ nodeId: row.nodeId, parentId: row.parentId });
        subTopicsByName.set(row.name, arr);
      }
    }

    return { subjects, topicsByName, subTopicsByName };
  }

  private async difficultyOrdinalsInUse(): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ ordinal: assessmentQuestions.authoredDifficulty })
      .from(assessmentQuestions);
    return rows.map((row) => row.ordinal);
  }

  private async subtreeIds(rootId: string): Promise<string[]> {
    const collected = [rootId];
    let frontier = [rootId];

    while (frontier.length > 0) {
      const children = await this.db
        .select({ nodeId: assessmentTaxonomyNodes.nodeId })
        .from(assessmentTaxonomyNodes)
        .where(inArray(assessmentTaxonomyNodes.parentId, frontier));

      frontier = children.map((child) => child.nodeId);
      collected.push(...frontier);
    }

    return collected;
  }

  private async node(
    nodeId: string,
    tx: Queryable = this.db,
  ): Promise<TaxonomyNode | undefined> {
    const [row] = await tx
      .select()
      .from(assessmentTaxonomyNodes)
      .where(eq(assessmentTaxonomyNodes.nodeId, nodeId))
      .limit(1);
    return row;
  }

  private async require(nodeId: string): Promise<TaxonomyNode> {
    const row = await this.node(nodeId);
    if (!row) throw new NotFoundException("Taxonomy node not found");
    return row;
  }

  private present(row: TaxonomyNode): TaxonomyNodeView {
    return {
      nodeId: row.nodeId,
      kind: row.kind,
      parentId: row.parentId,
      name: row.name,
      isRetired: row.isRetired,
    };
  }
}
