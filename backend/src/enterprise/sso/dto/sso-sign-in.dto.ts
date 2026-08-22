import { IsString, MinLength } from "class-validator";

export class SsoSignInDto {
  @IsString()
  @MinLength(1)
  token: string;
}
