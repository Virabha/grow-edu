import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePathDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;
}
