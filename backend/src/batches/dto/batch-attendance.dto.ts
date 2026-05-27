import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class RecordAttendanceDto {
  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;
}
