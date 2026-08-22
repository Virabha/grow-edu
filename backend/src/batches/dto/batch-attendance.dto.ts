import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class RecordAttendanceDto {
  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;
}

export class CorrectAttendanceDto {
  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ApiProperty({
    required: false,
    description: "Set false to mark the student absent for this session",
  })
  @IsBoolean()
  @IsOptional()
  present?: boolean;
}
