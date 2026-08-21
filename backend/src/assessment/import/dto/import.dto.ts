import { IsArray } from 'class-validator';

export class CreateImportDto {
  @IsArray()
  rows: unknown[];
}
