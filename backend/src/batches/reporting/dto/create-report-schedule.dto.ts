import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export type ReportCadence = "DAILY" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
export type ReportKind = "attendance" | "test-performance";

export class CreateReportScheduleDto {
  @ApiProperty({ enum: ["attendance", "test-performance"] })
  @IsIn(["attendance", "test-performance"])
  reportType: ReportKind;

  @ApiProperty({ enum: ["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"] })
  @IsIn(["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"])
  cadence: ReportCadence;

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
