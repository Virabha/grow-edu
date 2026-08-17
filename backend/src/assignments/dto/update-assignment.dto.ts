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

export class UpdateAssignmentDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiProperty({ enum: ["FILE", "TEXT", "LINK"], required: false })
  @IsEnum(["FILE", "TEXT", "LINK"])
  @IsOptional()
  submissionType?: "FILE" | "TEXT" | "LINK";

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  maxMarks?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  passMarks?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  allowResubmission?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
