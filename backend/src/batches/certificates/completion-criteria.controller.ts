import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { CompletionCriteriaService } from "./completion-criteria.service";

class UpdateCriteriaDto {
  @IsInt()
  @Min(0)
  @Max(100)
  minLessonCompletionPercent: number;

  @IsInt()
  @Min(0)
  @Max(100)
  minAttendancePercent: number;

  @IsInt()
  @Min(0)
  @Max(100)
  minTestAveragePercent: number;
}

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@Controller("batches")
export class CompletionCriteriaController {
  constructor(private readonly criteria: CompletionCriteriaService) {}

  @BatchAccess("MANAGE")
  @Get(":batchId/completion-criteria")
  getCriteria(@Param("batchId") batchId: string) {
    return this.criteria.get(batchId);
  }

  @BatchAccess("MANAGE")
  @Put(":batchId/completion-criteria")
  upsertCriteria(
    @Param("batchId") batchId: string,
    @Body() body: UpdateCriteriaDto,
    @CurrentUser() actor: AuthedUser,
  ) {
    return this.criteria.upsert(batchId, body, actor.userId);
  }
}
