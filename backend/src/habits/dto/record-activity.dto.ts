import { IsOptional, IsString } from "class-validator";

export class RecordActivityDto {
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;
}
