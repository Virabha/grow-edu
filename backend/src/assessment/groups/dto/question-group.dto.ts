import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateQuestionGroupDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ description: "Structured stimulus content blocks" })
  @IsArray()
  @Type(() => Object)
  stimulus: unknown[];
}

export class UpdateQuestionGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "Structured stimulus content blocks" })
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  stimulus?: unknown[];
}

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  order: number;
}
