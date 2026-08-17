import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class FilterSubmissionsDto extends PaginationDto {
  @ApiProperty({ enum: ["all", "SUBMITTED", "GRADED", "RETURNED"], required: false })
  @IsEnum(["all", "SUBMITTED", "GRADED", "RETURNED"])
  @IsOptional()
  status?: "all" | "SUBMITTED" | "GRADED" | "RETURNED";
}
