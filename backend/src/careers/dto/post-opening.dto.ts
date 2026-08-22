import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from "class-validator";

export class PostOpeningDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
