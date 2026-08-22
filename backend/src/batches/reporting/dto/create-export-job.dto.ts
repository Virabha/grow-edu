import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateExportJobDto {
  @ApiProperty({ enum: ["attendance", "test-performance"] })
  @IsIn(["attendance", "test-performance"])
  reportType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subGroupId?: string;
}
