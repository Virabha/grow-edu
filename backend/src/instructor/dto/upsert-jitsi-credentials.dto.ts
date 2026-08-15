import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class UpsertJitsiCredentialsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  appId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  appKey?: string;
}
