import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty({ enum: ['PUBLISHED', 'REJECTED'] })
  @IsIn(['PUBLISHED', 'REJECTED'])
  status: 'PUBLISHED' | 'REJECTED';
}
