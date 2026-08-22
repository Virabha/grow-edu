import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateQuestionsDto {
  @ApiPropertyOptional({ description: "Lesson to generate questions from" })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  topicId: string;

  @ApiProperty({ description: "Authored difficulty ordinal" })
  @IsInt()
  @Min(1)
  difficulty: number;

  @ApiProperty({ description: "Number of questions to generate", minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  count: number;
}

export class BulkGenerateQuestionsDto {
  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  topicId: string;

  @ApiProperty({ description: "Authored difficulty ordinal" })
  @IsInt()
  @Min(1)
  difficulty: number;

  @ApiProperty({ description: "Number of questions to generate", minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  count: number;
}
