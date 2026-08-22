import { IsString, IsNotEmpty, IsDateString } from "class-validator";

export class ScheduleMockInterviewDto {
  @IsString()
  @IsNotEmpty()
  pathId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsDateString()
  scheduledAt: string;
}
