import { IsNotEmpty, IsString } from 'class-validator';

export class SaveGoalDto {
  @IsNotEmpty()
  @IsString()
  goalKey: string;
}
