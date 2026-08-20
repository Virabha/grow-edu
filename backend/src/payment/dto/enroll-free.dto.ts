import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollFreeDto {
  @ApiProperty({ enum: ['COURSE', 'SECTION'] })
  @IsEnum(['COURSE', 'SECTION'])
  itemType: 'COURSE' | 'SECTION';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sectionId?: string;
}
