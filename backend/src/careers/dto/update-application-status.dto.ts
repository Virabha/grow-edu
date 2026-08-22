import { IsString, IsIn, IsOptional } from "class-validator";

export class UpdateApplicationStatusDto {
  @IsString()
  @IsIn(["NEW", "REVIEWED", "CONTACTED", "ACCEPTED", "REJECTED"])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
