import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export type QuestionType =
  | "SINGLE_CORRECT"
  | "MULTIPLE_CORRECT"
  | "NUMERIC"
  | "WRITTEN"
  | "IMAGE_UPLOAD";

export const QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CORRECT",
  "MULTIPLE_CORRECT",
  "NUMERIC",
  "WRITTEN",
  "IMAGE_UPLOAD",
];

export type PartialCreditRule = "ALL_OR_NOTHING" | "PROPORTIONAL";
export type ToleranceKind = "ABSOLUTE" | "RELATIVE";

export class CreateQuestionDto {
  @ApiProperty({ enum: QUESTION_TYPES })
  @IsIn(QUESTION_TYPES)
  type: QuestionType;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  topicId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subTopicId?: string;

  @ApiProperty({ description: "An ordinal from the configured scale" })
  @IsInt()
  @Min(1)
  difficulty: number;

  @ApiProperty({ description: "Structured content blocks" })
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  prompt: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  options?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  answerKey?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  explanation?: unknown[];

  @ApiPropertyOptional({ enum: ["ALL_OR_NOTHING", "PROPORTIONAL"] })
  @IsOptional()
  @IsIn(["ALL_OR_NOTHING", "PROPORTIONAL"])
  partialCreditRule?: PartialCreditRule;

  @ApiPropertyOptional({ enum: ["ABSOLUTE", "RELATIVE"] })
  @IsOptional()
  @IsIn(["ABSOLUTE", "RELATIVE"])
  toleranceKind?: ToleranceKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  tolerance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  groupOrder?: number;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  prompt?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  options?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  answerKey?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  explanation?: unknown[];

  @ApiPropertyOptional({ enum: ["ALL_OR_NOTHING", "PROPORTIONAL"] })
  @IsOptional()
  @IsIn(["ALL_OR_NOTHING", "PROPORTIONAL"])
  partialCreditRule?: PartialCreditRule;

  @ApiPropertyOptional({ enum: ["ABSOLUTE", "RELATIVE"] })
  @IsOptional()
  @IsIn(["ABSOLUTE", "RELATIVE"])
  toleranceKind?: ToleranceKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  tolerance?: number;
}

export class UpdateQuestionTagsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subTopicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  difficulty?: number;
}

export class SearchQuestionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subTopicId?: string;

  @ApiPropertyOptional({ enum: QUESTION_TYPES })
  @IsOptional()
  @IsIn(QUESTION_TYPES)
  type?: QuestionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  difficulty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeRetired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
