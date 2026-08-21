import { IsInt, Min, Max } from "class-validator";

export class SetGoalDto {
  @IsInt()
  @Min(1)
  @Max(720)
  dailyGoalMinutes: number;
}
