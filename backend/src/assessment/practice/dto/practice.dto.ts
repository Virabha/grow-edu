import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DailyPracticeQueryDto {
  @IsString()
  batchId: string;
}

export class RecordOutcomeDto {
  @IsBoolean()
  wasCorrect: boolean;
}

export class DivergentQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;
}
