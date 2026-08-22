import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
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

  @ApiProperty({
    required: false,
    enum: ["BATCH", "LESSON", "QUESTION"],
    default: "BATCH",
  })
  @IsEnum(["BATCH", "LESSON", "QUESTION"])
  @IsOptional()
  anchorType?: "BATCH" | "LESSON" | "QUESTION";

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  anchorId?: string;

  @ApiProperty({
    required: false,
    description: "Allow my name to be shown if this answer is published to the batch",
  })
  @IsBoolean()
  @IsOptional()
  consentToAttribution?: boolean;

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
