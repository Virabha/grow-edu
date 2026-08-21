import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";

export class CreateAssessmentTestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  negativeMarkPercent?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  scoreFloor?: number;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingPercent?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showLeaderboard?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showSolutions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  examYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paperLabel?: string;
}

export class UpdateAssessmentTestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  negativeMarkPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  scoreFloor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLeaderboard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSolutions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  examYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paperLabel?: string;
}

export class AddQuestionToTestDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionName?: string;

  @ApiProperty({ description: "Marks awarded for a correct answer; must be positive" })
  @IsNumber()
  @IsPositive()
  marks: number;

  @ApiPropertyOptional({ description: "Percent deducted per wrong answer; falls back to test default if absent" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  negativeMarkPercent?: number;
}

export class UpdateTestPlacementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  marks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  negativeMarkPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionName?: string;
}

export class ListTestsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;
}

export class ListPapersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  examYear?: number;
}
