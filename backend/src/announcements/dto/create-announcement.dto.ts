import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Short subject line', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200) // [Q] 200 chars for title feels right; raise to 300 if instructors complain
  title: string;

  @ApiProperty({ description: 'Full announcement body', maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000) // [Q] 10 k chars; long but announcements can be detailed
  body: string;
}
