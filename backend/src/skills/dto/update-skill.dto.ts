import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateSkillDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredItems?: number;

  @IsBoolean()
  @IsOptional()
  isRetired?: boolean;
}
