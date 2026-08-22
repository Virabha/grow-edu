import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { PathCompletionCriteriaService } from "./path-completion-criteria.service";

class UpdatePathCriteriaDto {
  @IsBoolean()
  @IsOptional()
  requireCapstone?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  minStagesCompletePercent?: number;
}

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("paths")
@Controller("paths")
export class PathCompletionCriteriaController {
  constructor(private readonly criteria: PathCompletionCriteriaService) {}

  @Roles("PLATFORM_ADMIN")
  @Get(":pathId/completion-criteria")
  get(@Param("pathId") pathId: string) {
    return this.criteria.get(pathId);
  }

  @Roles("PLATFORM_ADMIN")
  @Put(":pathId/completion-criteria")
  upsert(
    @Param("pathId") pathId: string,
    @Body() body: UpdatePathCriteriaDto,
    @CurrentUser() actor: AuthedUser,
  ) {
    return this.criteria.upsert(
      pathId,
      {
        requireCapstone: body.requireCapstone ?? true,
        minStagesCompletePercent: body.minStagesCompletePercent ?? 100,
      },
      actor.userId,
    );
  }
}
