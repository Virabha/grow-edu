import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ResolveRefundDto {
  @ApiProperty({ enum: ['APPROVED', 'DECLINED'] })
  @IsIn(['APPROVED', 'DECLINED'])
  status: 'APPROVED' | 'DECLINED';

  @ApiPropertyOptional({
    description: 'Amount to refund; defaults to everything still unrefunded',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({
    description:
      'Whether to revoke the access this payment granted. Defaults to true for a full refund and false for a partial one.',
  })
  @IsOptional()
  @IsBoolean()
  revokeAccess?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
