import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsISO8601, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class SubmitQuizAnswerDto {
  @ApiProperty({ description: 'ID of the question being answered' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({
    description: 'Zero-based index of the chosen option, or null if skipped',
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  chosenIndex: number | null;
}

export class SubmitQuizAttemptDto {
  @ApiProperty({ description: 'ID of the QUIZ-type lesson being attempted' })
  @IsString()
  lessonId: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp when the student opened the quiz (for duration calculation)',
  })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiProperty({ type: [SubmitQuizAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers: SubmitQuizAnswerDto[];
}
