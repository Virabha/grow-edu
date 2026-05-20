import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class InitiatePhonePeDto {
  @ApiProperty({ enum: ["COURSE", "SECTION"] })
  @IsEnum(["COURSE", "SECTION"])
  itemType!: "COURSE" | "SECTION";

  @ApiProperty()
  @IsString()
  courseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}
