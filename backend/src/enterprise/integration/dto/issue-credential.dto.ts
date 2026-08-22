import { IsString, MaxLength, MinLength } from "class-validator";

export class IssueCredentialDto {
  @IsString()
  @MinLength(1)
  companyId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;
}
