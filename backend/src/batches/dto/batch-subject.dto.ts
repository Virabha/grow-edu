import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class CreateBatchSubjectDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ required: false, description: "Hex color like #2563eb" })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "color must be a hex like #2563eb" })
  color?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateBatchSubjectDto extends PartialType(CreateBatchSubjectDto) {}
