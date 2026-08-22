import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  batchStatusEnum,
  pathEnrolmentStatusEnum,
  pathStageKindEnum,
  pathStageStateEnum,
  skillSubjectKindEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const learningPaths = pgTable(
  "learning_paths",
  {
    organizationId: organizationId(),
    pathId: text("path_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: batchStatusEnum("status").notNull().default("DRAFT"),
    createdBy: text("created_by").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    slugPerOrg: unique("learning_paths_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

export const pathStages = pgTable(
  "path_stages",
  {
    organizationId: organizationId(),
    stageId: text("stage_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pathId: text("path_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    kind: pathStageKindEnum("kind").notNull(),
    title: text("title").notNull(),
    batchId: text("batch_id"),
    problemSetId: text("problem_set_id"),
    projectId: text("project_id"),
    isCapstone: boolean("is_capstone").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    ordinalPerPath: unique("path_stages_ordinal_unique").on(
      table.pathId,
      table.ordinal,
    ),
    pathIdx: index("path_stages_path_idx").on(table.pathId, table.ordinal),
    batchIdx: index("path_stages_batch_idx").on(table.batchId),
  }),
);

export const pathStagePrerequisites = pgTable(
  "path_stage_prerequisites",
  {
    organizationId: organizationId(),
    prerequisiteId: text("prerequisite_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pathId: text("path_id").notNull(),
    stageId: text("stage_id").notNull(),
    requiredStageId: text("required_stage_id").notNull(),
  },
  (table) => ({
    onePerPair: unique("path_stage_prerequisites_unique").on(
      table.stageId,
      table.requiredStageId,
    ),
    stageIdx: index("path_stage_prerequisites_stage_idx").on(table.stageId),
  }),
);

export const pathEnrolments = pgTable(
  "path_enrolments",
  {
    organizationId: organizationId(),
    enrolmentId: text("enrolment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pathId: text("path_id").notNull(),
    userId: text("user_id").notNull(),
    status: pathEnrolmentStatusEnum("status").notNull().default("ACTIVE"),
    grantedBy: text("granted_by"),
    enrolledAt: timestamp("enrolled_at").notNull(),
    completedAt: timestamp("completed_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => ({
    onePerPath: unique("path_enrolments_unique").on(table.pathId, table.userId),
    userIdx: index("path_enrolments_user_idx").on(table.userId, table.status),
  }),
);

export const pathStageProgress = pgTable(
  "path_stage_progress",
  {
    organizationId: organizationId(),
    progressId: text("progress_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pathId: text("path_id").notNull(),
    stageId: text("stage_id").notNull(),
    userId: text("user_id").notNull(),
    state: pathStageStateEnum("state").notNull().default("LOCKED"),
    openedAt: timestamp("opened_at"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerStage: unique("path_stage_progress_unique").on(
      table.stageId,
      table.userId,
    ),
    userPathIdx: index("path_stage_progress_user_path_idx").on(
      table.userId,
      table.pathId,
    ),
  }),
);

export const skills = pgTable(
  "skills",
  {
    organizationId: organizationId(),
    skillId: text("skill_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    requiredItems: integer("required_items").notNull().default(1),
    isRetired: boolean("is_retired").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    keyPerOrg: unique("skills_organization_key_unique").on(
      table.organizationId,
      table.key,
    ),
  }),
);

export const skillTags = pgTable(
  "skill_tags",
  {
    organizationId: organizationId(),
    skillTagId: text("skill_tag_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    skillId: text("skill_id").notNull(),
    subjectKind: skillSubjectKindEnum("subject_kind").notNull(),
    subjectId: text("subject_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    oneTag: unique("skill_tags_unique").on(
      table.skillId,
      table.subjectKind,
      table.subjectId,
    ),
    subjectIdx: index("skill_tags_subject_idx").on(
      table.subjectKind,
      table.subjectId,
    ),
  }),
);

export const skillDemonstrations = pgTable(
  "skill_demonstrations",
  {
    organizationId: organizationId(),
    demonstrationId: text("demonstration_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    skillId: text("skill_id").notNull(),
    completedItems: integer("completed_items").notNull().default(0),
    demonstratedAt: timestamp("demonstrated_at"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerSkill: unique("skill_demonstrations_unique").on(
      table.userId,
      table.skillId,
    ),
  }),
);

export const pathCompletionCriteria = pgTable(
  "path_completion_criteria",
  {
    organizationId: organizationId(),
    criteriaId: text("criteria_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pathId: text("path_id").notNull(),
    requireCapstone: boolean("require_capstone").notNull().default(true),
    minStagesCompletePercent: integer("min_stages_complete_percent")
      .notNull()
      .default(100),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerPath: unique("path_completion_criteria_path_unique").on(table.pathId),
  }),
);

export const pathCertificates = pgTable(
  "path_certificates",
  {
    organizationId: organizationId(),
    certificateId: text("certificate_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pathId: text("path_id").notNull(),
    userId: text("user_id").notNull(),
    certificateNumber: text("certificate_number").notNull(),
    verificationCode: text("verification_code")
      .notNull()
      .$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
    issuedAt: timestamp("issued_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedBy: text("revoked_by"),
    revocationReason: text("revocation_reason"),
  },
  (table) => ({
    onePerStudent: unique("path_certificates_path_user_unique").on(
      table.pathId,
      table.userId,
    ),
    verificationUnique: unique("path_certificates_verification_unique").on(
      table.verificationCode,
    ),
    userIdx: index("path_certificates_user_idx").on(table.userId),
  }),
);
