import { IsString, MinLength } from 'class-validator';

export class UpsertLessonNoteDto {
  @IsString()
  @MinLength(1)
  body: string;
}
