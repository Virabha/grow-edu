import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStageDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  ordinal?: number;

  @IsBoolean()
  @IsOptional()
  isCapstone?: boolean;
}
