import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { StudyPlanPreferencesDto } from "./dto/study-plan-preferences.dto";
import { StudyPlanService } from "./study-plan.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai/study-plans")
export class StudyPlanController {
  constructor(private readonly studyPlans: StudyPlanService) {}

  @Authenticated()
  @ApiOperation({ summary: "Get the current study plan for the signed-in student" })
  @Get("mine")
  async getMine(@CurrentUser() user: AuthedUser) {
    const plan = await this.studyPlans.getCurrentPlan(user.userId);
    if (!plan) {
      throw new NotFoundException("No study plan has been generated yet");
    }
    return {
      planId: plan.planId,
      summary: plan.summary,
      items: plan.items,
      inputs: plan.inputs,
      generatedAt: plan.generatedAt.toISOString(),
    };
  }

  @Authenticated()
  @ApiOperation({ summary: "Set declared available study time" })
  @Put("preferences")
  updatePreferences(
    @CurrentUser() user: AuthedUser,
    @Body() dto: StudyPlanPreferencesDto,
  ) {
    return this.studyPlans.updatePreferences(user.userId, dto.availableMinutesPerDay);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Trigger study plan regeneration (admin only)" })
  @Post("regenerate")
  async triggerRegeneration() {
    await this.studyPlans.runRegeneration();
    return { queued: true };
  }
}
