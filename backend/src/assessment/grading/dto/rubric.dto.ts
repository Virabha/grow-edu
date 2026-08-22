import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";

export class CreateRubricDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  scaleMax: number;
}

export class UpdateRubricDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  scaleMax?: number;
}

export class AddCriterionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  @IsPositive()
  weight: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateCriterionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class AttachRubricDto {
  @IsString()
  @IsNotEmpty()
  rubricId: string;
}
