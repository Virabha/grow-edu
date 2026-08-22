import { IsNotEmpty, IsString } from 'class-validator';

export class AddPrerequisiteDto {
  @IsString()
  @IsNotEmpty()
  requiredStageId: string;
}
