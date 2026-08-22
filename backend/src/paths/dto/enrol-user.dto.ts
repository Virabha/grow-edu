import { IsNotEmpty, IsString } from 'class-validator';

export class EnrolUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
