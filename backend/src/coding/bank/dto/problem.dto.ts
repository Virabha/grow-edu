import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from "class-validator";

const PROBLEM_KINDS = ["ALGORITHMIC", "FRONTEND"] as const;
const VISIBILITIES = ["VISIBLE", "HIDDEN"] as const;

export class CreateProblemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must be lowercase letters, numbers and hyphens",
  })
  slug: string;

  @ApiPropertyOptional({ enum: PROBLEM_KINDS })
  @IsOptional()
  @IsEnum(PROBLEM_KINDS)
  kind?: (typeof PROBLEM_KINDS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty?: number;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @Transform(({ obj, key }) => obj[key])
  statement?: unknown[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @Transform(({ obj, key }) => obj[key])
  constraints?: unknown[];
}

export class UpdateProblemDto extends PartialType(CreateProblemDto) {}

export class UpsertLanguageDto {
  @ApiProperty()
  @IsString()
  language: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceSolution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(100)
  timeLimitMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(16)
  memoryLimitMb?: number;
}

export class UpsertTestCaseDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  ordinal: number;

  @ApiProperty({ enum: VISIBILITIES })
  @IsEnum(VISIBILITIES)
  visibility: (typeof VISIBILITIES)[number];

  @ApiProperty()
  @IsString()
  input: string;

  @ApiProperty()
  @IsString()
  expectedOutput: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;
}

export class UpsertAssertionDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  ordinal: number;

  @ApiProperty({ enum: VISIBILITIES })
  @IsEnum(VISIBILITIES)
  visibility: (typeof VISIBILITIES)[number];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  script: string;
}

export class UpsertEditorialDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  modelSolution: string;

  @ApiProperty()
  @IsString()
  modelSolutionLanguage: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  timeComplexity: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  spaceComplexity: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @Transform(({ obj, key }) => obj[key])
  body?: unknown[];
}

export class RunCodeDto {
  @ApiProperty()
  @IsString()
  language: string;

  @ApiProperty()
  @IsString()
  sourceCode: string;
}

export class SaveDraftDto {
  @ApiProperty()
  @IsString()
  language: string;

  @ApiProperty()
  @IsString()
  sourceCode: string;
}

export class RecordFrontendResultDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  passedOrdinals: number[];
}
