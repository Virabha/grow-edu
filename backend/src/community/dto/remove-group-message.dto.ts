import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RemoveGroupMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
