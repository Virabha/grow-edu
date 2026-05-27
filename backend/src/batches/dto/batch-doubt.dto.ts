import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateBatchDoubtDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class UpdateBatchDoubtDto extends PartialType(CreateBatchDoubtDto) {
  @ApiProperty({ required: false, enum: ["OPEN", "ANSWERED", "CLOSED"] })
  @IsEnum(["OPEN", "ANSWERED", "CLOSED"])
  @IsOptional()
  status?: "OPEN" | "ANSWERED" | "CLOSED";
}

export class CreateDoubtReplyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
