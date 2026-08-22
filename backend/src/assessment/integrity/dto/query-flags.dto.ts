import { IsOptional, IsString } from "class-validator";

export class QueryFlagsDto {
  @IsOptional()
  @IsString()
  testId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
