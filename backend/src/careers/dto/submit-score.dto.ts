import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
} from "class-validator";

export class SubmitScoreDto {
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
