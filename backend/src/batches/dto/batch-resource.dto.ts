import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateBatchResourceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ["DPP", "NOTES", "REFERENCE"] })
  @IsEnum(["DPP", "NOTES", "REFERENCE"])
  type: "DPP" | "NOTES" | "REFERENCE";

  @ApiProperty({ description: "Bunny Storage file key from /files/upload" })
  @IsString()
  @MinLength(1)
  fileKey: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  fileSize?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  pageCount?: number;

  @ApiProperty({ required: false, description: "DPP day number (1, 2, 3…)" })
  @IsInt()
  @Min(1)
  @IsOptional()
  dayNumber?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  publishAt?: string;
}

export class UpdateBatchResourceDto extends PartialType(CreateBatchResourceDto) {}
