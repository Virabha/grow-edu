import { IsString, IsNotEmpty } from "class-validator";

export class ApplyDto {
  @IsString()
  @IsNotEmpty()
  portfolioId: string;
}
