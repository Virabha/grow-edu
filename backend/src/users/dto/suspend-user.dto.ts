import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ description: 'Why the account is being suspended' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
