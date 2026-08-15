import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/** Admin-only: the set of status transitions an admin can apply. */
export enum AdminPayoutStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export class UpdatePayoutStatusDto {
  @ApiProperty({ enum: AdminPayoutStatus, description: 'New status for this payout request' })
  @IsEnum(AdminPayoutStatus)
  status: AdminPayoutStatus;

  @ApiPropertyOptional({ description: 'Optional note visible to the instructor' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}
