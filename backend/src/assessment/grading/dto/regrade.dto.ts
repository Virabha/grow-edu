import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class OpenRegradeRequestDto {
  @IsString()
  @IsNotEmpty()
  answerId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ResolveRegradeDto {
  @IsNumber()
  resolvedMarks: number;

  @IsString()
  @IsNotEmpty()
  justification: string;
}
