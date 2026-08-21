import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class SearchQueryDto {
  @IsNotEmpty()
  @IsString()
  q: string;

  @IsOptional()
  @IsIn(['BATCH', 'INSTRUCTOR'])
  kind?: 'BATCH' | 'INSTRUCTOR';
}
