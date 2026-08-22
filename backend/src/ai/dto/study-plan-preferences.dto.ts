import { IsInt, Max, Min } from "class-validator";

export class StudyPlanPreferencesDto {
  @IsInt()
  @Min(15)
  @Max(480)
  availableMinutesPerDay: number;
}
