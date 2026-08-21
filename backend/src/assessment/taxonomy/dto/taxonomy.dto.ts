import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export type TaxonomyKind = "SUBJECT" | "TOPIC" | "SUB_TOPIC";

export const TAXONOMY_KINDS: TaxonomyKind[] = [
  "SUBJECT",
  "TOPIC",
  "SUB_TOPIC",
];

export class CreateTaxonomyNodeDto {
  @ApiProperty({ enum: TAXONOMY_KINDS })
  @IsIn(TAXONOMY_KINDS)
  kind: TaxonomyKind;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "Required for TOPIC and SUB_TOPIC" })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateTaxonomyNodeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;
}

export class ListTaxonomyNodesDto {
  @ApiPropertyOptional({ enum: TAXONOMY_KINDS })
  @IsOptional()
  @IsIn(TAXONOMY_KINDS)
  kind?: TaxonomyKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeRetired?: boolean;
}

export class DifficultyLevelDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  ordinal: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;
}

export class ReplaceDifficultyScaleDto {
  @ApiProperty({ type: [DifficultyLevelDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DifficultyLevelDto)
  levels: DifficultyLevelDto[];
}
