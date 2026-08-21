import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAnnotationDto {
  @IsInt()
  @Min(0)
  page: number;

  @IsInt()
  @Min(0)
  startOffset: number;

  @IsInt()
  @Min(0)
  endOffset: number;

  @IsString()
  @MinLength(1)
  quotedText: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  colour?: string;
}
