import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuizQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  questionId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  text: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ description: 'Zero-based index of the correct option; must be >= 0 and < options.length' })
  @IsNumber()
  @Min(0)
  correctOptionIndex: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;
}

export class UpdateQuizQuestionsDto {
  @ApiProperty({ type: [QuizQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}
