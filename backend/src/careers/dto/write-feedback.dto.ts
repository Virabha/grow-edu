import { IsString, IsNotEmpty } from "class-validator";

export class WriteFeedbackDto {
  @IsString()
  @IsNotEmpty()
  notes: string;
}
