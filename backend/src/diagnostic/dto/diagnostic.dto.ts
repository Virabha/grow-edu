import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RecordDiagnosticDto {
  @ApiProperty()
  @IsString()
  attemptId: string;
}
