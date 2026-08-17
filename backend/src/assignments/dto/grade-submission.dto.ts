import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class GradeSubmissionDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  marks: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiProperty({ enum: ["GRADED", "RETURNED"], required: false, default: "GRADED" })
  @IsEnum(["GRADED", "RETURNED"])
  @IsOptional()
  status?: "GRADED" | "RETURNED";
}
