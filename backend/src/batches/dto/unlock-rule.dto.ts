import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, Max, Min } from "class-validator";

export class SetUnlockRuleDto {
  @ApiPropertyOptional({
    description: "Unlock on a fixed date, the same for every student",
  })
  @IsOptional()
  @IsDateString()
  unlockAt?: string | null;

  @ApiPropertyOptional({
    description:
      "Unlock this many days after each student's own enrolment starts",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  unlockAfterDays?: number | null;
}

export class SchedulePublicationDto {
  @ApiPropertyOptional({
    description: "Publish at this time. Omit to publish immediately.",
  })
  @IsOptional()
  @IsDateString()
  publishAt?: string;
}
