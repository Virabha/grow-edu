import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiPropertyOptional({ description: 'Course ID — required when posting via the ResourcePage flat endpoint' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Short subject line', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200) // [Q] 200 chars for title feels right; raise to 300 if instructors complain
  title!: string;

  @ApiProperty({ description: 'Full announcement body', maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000) // [Q] 10 k chars; long but announcements can be detailed
  body!: string;
}
