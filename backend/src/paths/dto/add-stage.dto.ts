import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddStageDto {
  @IsInt()
  @Min(1)
  ordinal: number;

  @IsIn(['BATCH', 'PROBLEM_SET', 'PROJECT'])
  kind: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  problemSetId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsBoolean()
  @IsOptional()
  isCapstone?: boolean;
}
