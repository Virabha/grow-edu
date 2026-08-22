import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPaymentDto {
  @ApiProperty({
    description: 'Why the proof was refused. The student reads this verbatim.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(1000)
  reason: string;
}
