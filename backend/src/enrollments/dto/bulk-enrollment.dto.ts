import { IsString, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkEnrollmentDto {
  @ApiProperty({ example: 'course-id-here' })
  @IsString()
  courseId: string;

  @ApiProperty({ example: ['user-id-1', 'user-id-2'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];
}

