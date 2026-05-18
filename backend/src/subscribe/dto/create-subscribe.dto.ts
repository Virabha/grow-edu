import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CreateSubscribeDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
