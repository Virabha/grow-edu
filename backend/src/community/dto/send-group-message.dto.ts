import { IsString, MaxLength } from 'class-validator';

export class SendGroupMessageDto {
  @IsString()
  @MaxLength(2000)
  body: string;
}
