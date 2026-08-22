import { IsString, IsNotEmpty } from "class-validator";

export class AssignMentorDto {
  @IsString()
  @IsNotEmpty()
  pathId: string;

  @IsString()
  @IsNotEmpty()
  mentorId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;
}
