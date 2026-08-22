import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

const LESSON_TYPES = [
  "VIDEO",
  "TEXT",
  "QUIZ",
  "DOCUMENT",
  "AUDIO",
  "RICH",
  "LIVE_SESSION",
] as const;
const LESSON_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PROCESSING",
  "READY",
] as const;
const INSTRUCTOR_ROLES = ["LEAD", "SUBJECT", "ASSISTANT"] as const;

export class LessonResourceDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsUrl()
  url: string;
}

export class CreateLessonDto {
  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ enum: LESSON_TYPES })
  @IsEnum(LESSON_TYPES)
  type: (typeof LESSON_TYPES)[number];

  @ApiProperty()
  @IsInt()
  order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  audioDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentFileKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  documentPageCount?: number;

  @ApiPropertyOptional({ description: "The batch session a LIVE_SESSION lesson resolves to" })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: "The quiz a QUIZ lesson resolves to" })
  @IsOptional()
  @IsString()
  quizId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ enum: LESSON_STATUSES })
  @IsOptional()
  @IsEnum(LESSON_STATUSES)
  status?: (typeof LESSON_STATUSES)[number];

  @ApiPropertyOptional({ type: [LessonResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonResourceDto)
  resources?: LessonResourceDto[];
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

export class ReorderLessonDto {
  @ApiProperty()
  @IsString()
  lessonId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderLessonsDto {
  @ApiProperty({ type: [ReorderLessonDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderLessonDto)
  lessons: ReorderLessonDto[];
}

export class AssignInstructorDto {
  @ApiProperty()
  @IsString()
  instructorId: string;

  @ApiPropertyOptional({ enum: INSTRUCTOR_ROLES, default: "SUBJECT" })
  @IsOptional()
  @IsEnum(INSTRUCTOR_ROLES)
  role?: (typeof INSTRUCTOR_ROLES)[number];
}

export class PlaceTestDto {
  @ApiProperty()
  @IsString()
  testId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  unlockAfterDays?: number;
}

export class ReorderCurriculumItemDto {
  @ApiProperty()
  @IsString()
  placementId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderCurriculumDto {
  @ApiProperty({ type: [ReorderCurriculumItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderCurriculumItemDto)
  items: ReorderCurriculumItemDto[];
}
