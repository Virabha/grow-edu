import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateBatchEnrollmentsDto {
  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @ApiProperty({ type: [String], required: false, description: "Email addresses to enroll" })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  emails?: string[];

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  accessEndsAt?: string;
}

export class BulkEnrollmentsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  identifiers: string[];
}
