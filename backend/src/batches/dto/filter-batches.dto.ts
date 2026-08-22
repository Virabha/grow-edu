import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class FilterBatchesDto extends PaginationDto {
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

  @ApiProperty({ enum: ["LIVE", "RECORDED", "HYBRID"], required: false })
  @IsEnum(["LIVE", "RECORDED", "HYBRID"])
  @IsOptional()
  deliveryMode?: "LIVE" | "RECORDED" | "HYBRID";

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instructorId?: string;
}
