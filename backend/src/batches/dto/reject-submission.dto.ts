import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class RejectSubmissionDto {
  @ApiProperty({
    description: "What the author must change. They read this verbatim.",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  comment: string;
}
