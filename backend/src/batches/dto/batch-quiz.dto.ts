import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsDefined,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { QuizCorrectAnswer } from "../../database/schema/batches";

export class CreateBatchQuizDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({ default: 30 })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  maxAttempts: number;

  @ApiProperty({ default: 0, description: "Percent of marks deducted per wrong answer (0-100)" })
  @IsNumber()
  @Min(0)
  negativeMarkPercent: number;

  @ApiProperty({ default: 40 })
  @IsNumber()
  @Min(0)
  passingPercent: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  showLeaderboard?: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  showSolutions?: boolean;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  opensAt?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  closesAt?: string;

  @ApiProperty({ default: false, description: "Publish on create" })
  @IsBoolean()
  @IsOptional()
  publish?: boolean;
}

export class UpdateBatchQuizDto extends PartialType(CreateBatchQuizDto) {}

class QuizOptionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  text: string;
}

export class CreateQuizQuestionDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ enum: ["MCQ_SINGLE", "MCQ_MULTI", "NUMERICAL"] })
  @IsEnum(["MCQ_SINGLE", "MCQ_MULTI", "NUMERICAL"])
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "NUMERICAL";

  @ApiProperty()
  @IsString()
  @MinLength(1)
  prompt: string;

  @ApiProperty({ type: [QuizOptionDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  @IsOptional()
  options?: QuizOptionDto[];

  @ApiProperty({
    description: "MCQ_SINGLE: option id; MCQ_MULTI: option ids; NUMERICAL: {value, tolerance?}",
  })
  @IsDefined()
  correctAnswer: QuizCorrectAnswer;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  marks: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  explanation?: string;
}

export class UpdateQuizQuestionDto extends PartialType(CreateQuizQuestionDto) {}

export class SubmitQuizAnswerDto {
  @ApiProperty({
    description:
      "Object keyed by questionId. Value: MCQ_SINGLE=string, MCQ_MULTI=string[], NUMERICAL=number",
  })
  @IsObject()
  answers: Record<string, unknown>;
}
