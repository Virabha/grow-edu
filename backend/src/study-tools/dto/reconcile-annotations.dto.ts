import { IsString, MinLength } from 'class-validator';

export class ReconcileAnnotationsDto {
  @IsString()
  @MinLength(1)
  documentText: string;
}
