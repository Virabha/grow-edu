import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateReportScheduleDto {
  @ApiProperty({ enum: ["attendance", "test-performance"] })
  @IsIn(["attendance", "test-performance"])
  reportType: string;

  @ApiProperty({ enum: ["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"] })
  @IsIn(["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"])
  cadence: string;

  @ApiPropertyOptional({ description: "Limit the summary to one sub-group" })
  @IsOptional()
  @IsString()
  subGroupId?: string;
}

export class PauseReportScheduleDto {
  @ApiProperty()
  @IsIn([true, false])
  isPaused: boolean;
}
