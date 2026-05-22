import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQRSettingsDto {
  @ApiProperty({ required: false, description: 'Public URL of QR-code image' })
  @IsOptional()
  @IsString()
  qrImageUrl?: string;

  @ApiProperty({ required: false, description: 'UPI ID for direct UPI payments' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  upiId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankIfsc?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankAccountHolder?: string;

  @ApiProperty({ required: false, description: 'Markdown/plain-text instructions shown to learner' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;
}
