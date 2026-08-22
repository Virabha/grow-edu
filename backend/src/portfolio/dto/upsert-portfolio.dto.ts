import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class UpsertPortfolioDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/)
  handle: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
