import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewQueueQueryDto {
  @IsOptional()
  @IsString()
  batchId?: string;
}

export class CompleteEntryDto {
  @IsOptional()
  @IsEnum(['CORRECT', 'WRONG'])
  outcome?: 'CORRECT' | 'WRONG';
}
