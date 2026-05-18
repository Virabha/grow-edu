import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadProofDto {
  @ApiProperty({ description: 'URL of uploaded proof screenshot (from /storage/upload)' })
  @IsString()
  @IsUrl({ require_tld: false })
  proofUrl: string;
}
