import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CriterionScoreDto {
  @IsString()
  criterionId: string;

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateProjectReviewDto {
  @IsEnum(["PASSED", "RETURNED"])
  outcome: "PASSED" | "RETURNED";

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionScoreDto)
  criteria: CriterionScoreDto[];

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  feedbackMediaId?: string;
}
