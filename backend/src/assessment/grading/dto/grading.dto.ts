import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CriterionScoreDto {
  @IsString()
  criterionId: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class GradeAnswerDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionScoreDto)
  criteria?: CriterionScoreDto[];

  @IsOptional()
  @IsNumber()
  totalMarks?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class AttachFeedbackDto {
  @IsString()
  mediaKey: string;
}
