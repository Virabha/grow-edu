import { IsEnum, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsEnum(['FEED_POST', 'GROUP_MESSAGE'])
  targetKind: 'FEED_POST' | 'GROUP_MESSAGE';

  @IsString()
  targetId: string;

  @IsString()
  @MaxLength(500)
  reason: string;
}
