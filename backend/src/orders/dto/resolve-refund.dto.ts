import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ResolveRefundDto {
  @ApiProperty({ enum: ['APPROVED', 'DECLINED'] })
  @IsIn(['APPROVED', 'DECLINED'])
  status: 'APPROVED' | 'DECLINED';
}
