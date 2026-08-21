import { IsNotEmpty, IsString } from 'class-validator';

export class LinkPhoneDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class LinkGoogleDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
