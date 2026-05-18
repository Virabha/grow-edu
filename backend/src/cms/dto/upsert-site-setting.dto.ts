import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class UpsertSiteSettingDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsObject()
  value: Record<string, unknown>;
}
