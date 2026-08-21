import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReportDto {
  @IsEnum(['RESOLVED', 'DISMISSED'])
  status: 'RESOLVED' | 'DISMISSED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  outcome?: string;
}
