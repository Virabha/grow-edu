import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ConfigureBrandingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;
}
