import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class TopicCountDto {
  @IsString()
  topicId: string;

  @IsInt()
  @Min(1)
  count: number;
}

export class DifficultyCountDto {
  @IsInt()
  @Min(1)
  ordinal: number;

  @IsInt()
  @Min(1)
  count: number;
}

export class GenerationCriteriaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicCountDto)
  topicCounts: TopicCountDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DifficultyCountDto)
  difficultyCounts: DifficultyCountDto[];

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  excludeStudentId?: string;
}
