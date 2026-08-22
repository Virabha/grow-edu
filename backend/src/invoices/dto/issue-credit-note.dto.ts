import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class IssueCreditNoteDto {
  @ApiProperty({ description: "Why the original invoice is being corrected" })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: "Amount to credit; defaults to the whole uncredited balance",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;
}
