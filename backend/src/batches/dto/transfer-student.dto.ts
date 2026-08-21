import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class TransferStudentDto {
  @ApiProperty({ description: "The batch the student is being moved into" })
  @IsString()
  @IsNotEmpty()
  toBatchId: string;

  @ApiPropertyOptional({
    description:
      "Queue the student on the destination waitlist when it is full, rather than refusing",
  })
  @IsOptional()
  @IsBoolean()
  waitlistIfFull?: boolean;

  @ApiPropertyOptional({ description: "Why the student is being moved" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
