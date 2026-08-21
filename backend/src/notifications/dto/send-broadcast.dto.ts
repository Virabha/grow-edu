import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export type BroadcastAudience = "BATCH" | "CORPORATE" | "SUB_GROUP" | "SEGMENT";

export class SendBroadcastDto {
  @ApiProperty({ enum: ["BATCH", "CORPORATE", "SUB_GROUP", "SEGMENT"] })
  @IsEnum(["BATCH", "CORPORATE", "SUB_GROUP", "SEGMENT"])
  audienceType: BroadcastAudience;

  @ApiPropertyOptional({
    description: "The batch, company or sub-group this is going to",
  })
  @IsOptional()
  @IsString()
  audienceId?: string;

  @ApiPropertyOptional({
    description:
      "Filters for a SEGMENT broadcast: role, companyId, joinedAfter. At least one is required.",
  })
  @IsOptional()
  @IsObject()
  segment?: Record<string, string>;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}
