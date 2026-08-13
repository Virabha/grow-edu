import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderItemDto {
  @ApiProperty()
  @IsString()
  lessonId: string;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class ReorderLessonsDto {
  @ApiProperty()
  @IsString()
  sectionId: string;

  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  lessons: ReorderItemDto[];
}
