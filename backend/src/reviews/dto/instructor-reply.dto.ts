import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InstructorReplyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reply: string;
}
