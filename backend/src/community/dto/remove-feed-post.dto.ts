import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RemoveFeedPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
