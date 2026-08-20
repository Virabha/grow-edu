import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class RecordLessonProgressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: "Seconds to add to the running total" })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: "Playback position in seconds" })
  @IsOptional()
  @IsInt()
  @Min(0)
  lastPosition?: number;
}
