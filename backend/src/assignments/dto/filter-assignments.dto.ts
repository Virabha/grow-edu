import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class FilterAssignmentsDto extends PaginationDto {
  @ApiProperty({ enum: ["all", "FILE", "TEXT", "LINK"], required: false })
  @IsEnum(["all", "FILE", "TEXT", "LINK"])
  @IsOptional()
  submissionType?: "all" | "FILE" | "TEXT" | "LINK";

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;
}
