import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredItems?: number;
}
