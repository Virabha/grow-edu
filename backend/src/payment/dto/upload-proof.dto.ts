import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UploadProofDto {
  @ApiProperty({
    description: "URL of uploaded proof screenshot (from /storage/upload)",
  })
  @IsString()
  @IsUrl({ require_tld: false })
  proofUrl: string;

  @ApiProperty({
    description:
      "Bank / UPI transaction reference number. Must be unique across all payments.",
  })
  @IsString()
  @MinLength(4, { message: "Transaction ID must be at least 4 characters" })
  @MaxLength(64, { message: "Transaction ID is too long" })
  transactionId: string;

  @ApiPropertyOptional({
    description: "Name of the payer (helps the admin match the receipt)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  payerName?: string;
}
