import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class RescheduleSessionDto {
  @ApiProperty({ description: "New ISO start datetime for this session (UTC)" })
  @IsDateString()
  scheduledStartAt: string;

  @ApiProperty({ description: "New ISO end datetime for this session (UTC)" })
  @IsDateString()
  scheduledEndAt: string;
}
