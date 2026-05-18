import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveCourseDto {
  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether to publish immediately', default: true })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class RequestChangesDto {
  @ApiPropertyOptional({ description: 'Review notes explaining changes needed' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectCourseDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  @MinLength(1)
  reason: string;
}
