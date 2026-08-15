import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, Matches } from 'class-validator';

export class CertificateTemplateDto {
  @ApiProperty({ description: 'Background image URL or empty string', example: 'https://cdn.example.com/bg.png' })
  @IsString()
  @Matches(/^(https?:\/\/.+)?$/, { message: 'backgroundUrl must be an http/https URL or empty string' })
  backgroundUrl: string;

  @ApiProperty({ description: 'Signature image URL or empty string', example: 'https://cdn.example.com/sig.png' })
  @IsString()
  @Matches(/^(https?:\/\/.+)?$/, { message: 'signatureUrl must be an http/https URL or empty string' })
  signatureUrl: string;

  @ApiProperty({ example: 'Dr. Ananya Rao' })
  @IsString()
  signatoryName: string;

  @ApiProperty({ example: 'Director of Studies' })
  @IsString()
  signatoryTitle: string;

  @ApiProperty({
    description: 'Body text. Supports {{learner_name}}, {{course_title}}, {{completion_date}}.',
    example: 'This certifies that {{learner_name}} has completed {{course_title}} on {{completion_date}}.',
  })
  @IsString()
  bodyText: string;

  @ApiProperty()
  @IsBoolean()
  showQrCode: boolean;

  @ApiProperty()
  @IsBoolean()
  showCertificateId: boolean;

  @ApiProperty({ description: '3- or 6-digit CSS hex colour', example: '#2563eb' })
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'accentColour must be a valid 3- or 6-digit hex colour (e.g. #2563eb)',
  })
  accentColour: string;
}
