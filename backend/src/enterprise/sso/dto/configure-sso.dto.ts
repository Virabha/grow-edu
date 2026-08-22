import { IsIn, IsString, MinLength } from "class-validator";

export class ConfigureSsoDto {
  @IsIn(["OIDC", "SAML"])
  providerType: "OIDC" | "SAML";

  @IsString()
  @MinLength(1)
  issuerUrl: string;

  @IsString()
  @MinLength(1)
  clientId: string;

  @IsString()
  @MinLength(1)
  clientSecret: string;
}
