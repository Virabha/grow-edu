import { IsIn, IsOptional, IsString } from 'class-validator';

type PathStatus = 'DRAFT' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';

export class UpdatePathDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'ARCHIVED'])
  @IsOptional()
  status?: PathStatus;
}
