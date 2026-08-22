import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class CreateSkillTagDto {
  @IsString()
  @IsIn(["PROBLEM", "PROJECT", "STAGE"])
  subjectKind: "PROBLEM" | "PROJECT" | "STAGE";

  @IsString()
  @IsNotEmpty()
  subjectId: string;
}
