import { IsNotEmpty, IsString } from 'class-validator';

export class RequestPhoneCodeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class VerifyPhoneCodeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
