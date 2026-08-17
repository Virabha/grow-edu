import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateAssignmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  courseId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiProperty({ enum: ["FILE", "TEXT", "LINK"] })
  @IsEnum(["FILE", "TEXT", "LINK"])
  submissionType: "FILE" | "TEXT" | "LINK";

  @ApiProperty({ default: 100 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxMarks: number;

  @ApiProperty({ default: 40 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  passMarks: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  allowResubmission?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
