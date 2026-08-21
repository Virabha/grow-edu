import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStudyGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;
}
