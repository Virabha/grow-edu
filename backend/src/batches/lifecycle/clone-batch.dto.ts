import { IsOptional, IsString } from "class-validator";

export class CloneBatchDto {
  @IsString()
  @IsOptional()
  slug?: string;
}
