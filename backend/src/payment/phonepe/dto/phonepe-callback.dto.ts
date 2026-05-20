import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

// PhonePe sends a base64-encoded JSON body with this shape; we accept the
// raw envelope and decode in the service.
export class PhonePeCallbackDto {
  @ApiProperty()
  @IsString()
  response!: string;
}
