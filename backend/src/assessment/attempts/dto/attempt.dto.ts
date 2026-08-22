import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDefined, IsOptional, IsString } from "class-validator";

export class SaveAnswerDto {
  @ApiPropertyOptional({
    description:
      "An option id, a list of option ids, a number, or written text. Omit to clear.",
  })
  @IsOptional()
  @IsDefined()
  response?: unknown;
}

export class FocusDto {
  @ApiProperty()
  @IsString()
  placementId: string;
}
