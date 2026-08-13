import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateServiceApplicationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  formData: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantPhone?: string;
}
