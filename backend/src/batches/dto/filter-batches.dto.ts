import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class FilterBatchesDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  targetExam?: string;

  @ApiProperty({
    enum: ["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "ARCHIVED"],
    required: false,
  })
  @IsEnum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "ARCHIVED"])
  @IsOptional()
  status?: "DRAFT" | "UPCOMING" | "ONGOING" | "COMPLETED" | "ARCHIVED";

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
