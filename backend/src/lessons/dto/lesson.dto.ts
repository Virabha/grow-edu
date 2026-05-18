import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, ValidateNested, IsBoolean, IsArray, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuizSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeLimitMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  attemptsAllowed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}

export class ResourceDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsUrl()
  url: string;
}

export class CreateLessonDto {
  @ApiProperty()
  @IsString()
  sectionId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ enum: ['VIDEO', 'TEXT', 'QUIZ'] })
  @IsEnum(['VIDEO', 'TEXT', 'QUIZ'])
  type: 'VIDEO' | 'TEXT' | 'QUIZ';

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ type: [ResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources?: ResourceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => QuizSettingsDto)
  quizSettings?: QuizSettingsDto;
}

export class UpdateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ type: [ResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources?: ResourceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => QuizSettingsDto)
  quizSettings?: QuizSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bumpQuizVersion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PROCESSING', 'READY'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PROCESSING', 'READY'])
  status?: 'DRAFT' | 'PROCESSING' | 'READY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}
