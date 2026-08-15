import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSiteLanguageDto {
  @ApiProperty({ example: 'Hindi' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'hi', description: 'Two-letter ISO code' })
  @IsString()
  @MinLength(1)
  code: string;

  /**
   * Accepted from the frontend form but not persisted — the siteLanguages table
   * does not have a direction column. Included here so forbidNonWhitelisted does
   * not reject requests that include it.
   */
  @ApiPropertyOptional({ enum: ['ltr', 'rtl'] })
  @IsOptional()
  @IsString()
  @IsIn(['ltr', 'rtl'])
  direction?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
