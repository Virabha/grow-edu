import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class WriteFeedbackDto {
  @ApiProperty({ description: "What the student should read" })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(5000)
  body: string;
}
