import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class BulkUploadRowDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}

export class BulkRosterUploadDto {
  @ApiProperty({ type: [BulkUploadRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUploadRowDto)
  rows: BulkUploadRowDto[];
}
