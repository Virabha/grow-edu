import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class IssueJoinLinkDto {
  @ApiPropertyOptional({
    description: 'Defaults to 30 days, or the contract end date if sooner.',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
