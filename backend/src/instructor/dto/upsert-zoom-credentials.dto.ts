import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class UpsertZoomCredentialsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  clientId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  clientSecret?: string;
}
