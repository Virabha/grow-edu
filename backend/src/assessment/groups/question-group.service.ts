import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  ContentBlock,
  assessmentQuestionGroups,
  assessmentQuestions,
} from "../../database/schema";
import { parseContent } from "../bank/content";
import {
  AddMemberDto,
  CreateQuestionGroupDto,
  UpdateQuestionGroupDto,
} from "./dto/question-group.dto";

type GroupRow = typeof assessmentQuestionGroups.$inferSelect;
type QuestionRow = typeof assessmentQuestions.$inferSelect;

export interface QuestionGroupView {
  groupId: string;
  title: string;
  stimulus: ContentBlock[];
  isRetired: boolean;
  createdBy: string;
}

export interface QuestionGroupDetail {
  groupId: string;
  title: string;
  stimulus: ContentBlock[];
  isRetired: boolean;
  createdBy: string;
  members: Array<{
    questionId: string;
    groupOrder: number;
    type: string;
    isRetired: boolean;
    subjectId: string;
    topicId: string;
    subTopicId: string | null;
    authoredDifficulty: number;
  }>;
}

@Injectable()
export class QuestionGroupService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly auditLog: AuditLogService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(
    dto: CreateQuestionGroupDto,
    actorId: string,
  ): Promise<QuestionGroupView> {
    const stimulus = parseContent(dto.stimulus, "stimulus");
    const now = this.clock.now();

    const [group] = await this.db
      .insert(assessmentQuestionGroups)
      .values({
        title: dto.title,
        stimulus,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.present(group);
  }

  async get(groupId: string): Promise<QuestionGroupDetail> {
    const group = await this.requireGroup(groupId);
    const members = await this.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.groupId, groupId))
      .orderBy(asc(assessmentQuestions.groupOrder));

    return this.presentDetail(group, members);
  }

  async update(
    groupId: string,
    dto: UpdateQuestionGroupDto,
    actorId: string,
  ): Promise<QuestionGroupView> {
    const group = await this.requireGroup(groupId);
    if (group.isRetired) {
      throw new ConflictException("A retired group cannot be edited");
    }

    const stimulus =
      dto.stimulus === undefined
        ? group.stimulus
        : parseContent(dto.stimulus, "stimulus");

    const [updated] = await this.db
      .update(assessmentQuestionGroups)
      .set({
        title: dto.title ?? group.title,
        stimulus,
        updatedAt: this.clock.now(),
      })
      .where(eq(assessmentQuestionGroups.groupId, groupId))
      .returning();

    await this.auditLog.record({
      action: "assessment.group.update",
      targetType: "assessmentQuestionGroup",
      targetId: groupId,
      before: { title: group.title },
      after: { title: updated.title, actorId },
    });

    return this.present(updated);
  }

  async addMember(
    groupId: string,
    dto: AddMemberDto,
  ): Promise<QuestionGroupDetail> {
    const group = await this.requireGroup(groupId);
    if (group.isRetired) {
      throw new ConflictException("A retired group cannot accept new members");
    }

    const [question] = await this.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, dto.questionId))
      .limit(1);

    if (!question) {
      throw new NotFoundException("Question not found");
    }

    if (question.groupId !== null && question.groupId !== groupId) {
      throw new ConflictException(
        "That question already belongs to another group",
      );
    }

    const now = this.clock.now();
    await this.db
      .update(assessmentQuestions)
      .set({ groupId, groupOrder: dto.order, updatedAt: now })
      .where(eq(assessmentQuestions.questionId, dto.questionId));

    return this.get(groupId);
  }

  async removeMember(
    groupId: string,
    questionId: string,
  ): Promise<QuestionGroupDetail> {
    await this.requireGroup(groupId);

    const [question] = await this.db
      .select()
      .from(assessmentQuestions)
      .where(
        and(
          eq(assessmentQuestions.questionId, questionId),
          eq(assessmentQuestions.groupId, groupId),
        ),
      )
      .limit(1);

    if (!question) {
      throw new NotFoundException(
        "That question is not a member of this group",
      );
    }

    await this.db
      .update(assessmentQuestions)
      .set({
        groupId: null,
        groupOrder: null,
        updatedAt: this.clock.now(),
      })
      .where(eq(assessmentQuestions.questionId, questionId));

    return this.get(groupId);
  }

  async retire(groupId: string): Promise<QuestionGroupView> {
    const group = await this.requireGroup(groupId);
    if (group.isRetired) {
      throw new ConflictException("Group is already retired");
    }

    const now = this.clock.now();
    const [updated] = await this.db
      .update(assessmentQuestionGroups)
      .set({ isRetired: true, updatedAt: now })
      .where(eq(assessmentQuestionGroups.groupId, groupId))
      .returning();

    await this.auditLog.record({
      action: "assessment.group.retire",
      targetType: "assessmentQuestionGroup",
      targetId: groupId,
      before: { isRetired: false },
      after: { isRetired: true },
    });

    return this.present(updated);
  }

  private async requireGroup(groupId: string): Promise<GroupRow> {
    const [row] = await this.db
      .select()
      .from(assessmentQuestionGroups)
      .where(eq(assessmentQuestionGroups.groupId, groupId))
      .limit(1);
    if (!row) throw new NotFoundException("Question group not found");
    return row;
  }

  private present(group: GroupRow): QuestionGroupView {
    return {
      groupId: group.groupId,
      title: group.title,
      stimulus: group.stimulus,
      isRetired: group.isRetired,
      createdBy: group.createdBy,
    };
  }

  private presentDetail(
    group: GroupRow,
    members: QuestionRow[],
  ): QuestionGroupDetail {
    return {
      groupId: group.groupId,
      title: group.title,
      stimulus: group.stimulus,
      isRetired: group.isRetired,
      createdBy: group.createdBy,
      members: members.map((q) => ({
        questionId: q.questionId,
        groupOrder: q.groupOrder ?? 0,
        type: q.type,
        isRetired: q.isRetired,
        subjectId: q.subjectId,
        topicId: q.topicId,
        subTopicId: q.subTopicId,
        authoredDifficulty: q.authoredDifficulty,
      })),
    };
  }
}
