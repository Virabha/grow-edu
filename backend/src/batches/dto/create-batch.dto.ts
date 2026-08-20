import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { AssignInstructorDto } from "./batch-content.dto";

export class CreateBatchDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiProperty({ required: false, description: "e.g. NEET 2026, JEE Main 2026" })
  @IsString()
  @IsOptional()
  targetExam?: string;

  @ApiProperty({ default: "English" })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ required: false, description: "File key from /files/upload" })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bannerImage?: string;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  @ApiProperty({ default: "INR" })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({
    enum: ["LIVE", "RECORDED", "HYBRID"],
    default: "LIVE",
    required: false,
  })
  @IsEnum(["LIVE", "RECORDED", "HYBRID"])
  @IsOptional()
  deliveryMode?: "LIVE" | "RECORDED" | "HYBRID";

  @ApiProperty({ type: [AssignInstructorDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignInstructorDto)
  @IsOptional()
  instructors?: AssignInstructorDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    enum: ["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "ARCHIVED"],
    default: "DRAFT",
    required: false,
  })
  @IsEnum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "ARCHIVED"])
  @IsOptional()
  status?: "DRAFT" | "UPCOMING" | "ONGOING" | "COMPLETED" | "ARCHIVED";
}
