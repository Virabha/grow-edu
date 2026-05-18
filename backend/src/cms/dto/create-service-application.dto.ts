import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateServiceApplicationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  formData: any;

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
