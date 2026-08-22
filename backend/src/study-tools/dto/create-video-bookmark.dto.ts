import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVideoBookmarkDto {
  @IsInt()
  @Min(0)
  timestampSeconds: number;

  @IsOptional()
  @IsString()
  note?: string;
}
