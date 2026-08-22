import { IsString, MaxLength } from 'class-validator';

export class CreateFeedPostDto {
  @IsString()
  @MaxLength(2000)
  body: string;
}
