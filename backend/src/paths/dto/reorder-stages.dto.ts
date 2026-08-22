import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class StageOrderItemDto {
  @IsString()
  stageId: string;

  @IsInt()
  @Min(1)
  ordinal: number;
}

export class ReorderStagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderItemDto)
  stages: StageOrderItemDto[];
}
