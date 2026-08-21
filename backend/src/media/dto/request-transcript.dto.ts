import { IsOptional, IsString, Length } from 'class-validator';

export class RequestTranscriptDto {
  @IsOptional()
  @IsString()
  @Length(2, 10)
  language?: string;
}
