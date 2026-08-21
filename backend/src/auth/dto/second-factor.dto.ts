import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmSecondFactorDto {
  @ApiProperty({ description: 'The six-digit code your authenticator shows' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class SecondFactorChallengeDto {
  @ApiProperty({ description: 'The challenge handed back by /auth/login' })
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @ApiProperty({
    description: 'A six-digit code, or one of your recovery codes',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(32)
  code: string;
}

export class DisableSecondFactorDto {
  @ApiProperty({ description: 'The six-digit code your authenticator shows' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}
