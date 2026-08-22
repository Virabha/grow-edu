import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateParentLinkDto {
  @ApiProperty({ description: 'The userId of the student this parent wants to monitor' })
  @IsString()
  @IsUUID()
  studentUserId: string;
}
