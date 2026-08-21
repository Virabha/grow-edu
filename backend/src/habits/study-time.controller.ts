import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BadgeService } from "./badge.service";
import { RecordActivityDto } from "./dto/record-activity.dto";
import { SetGoalDto } from "./dto/set-goal.dto";
import { StreakService } from "./streak.service";
import { StudyTimeService } from "./study-time.service";

type JwtUser = { sub: string; email: string; role: string };

@Controller("habits")
export class StudyTimeController {
  constructor(
    private readonly studyTime: StudyTimeService,
    private readonly streak: StreakService,
    private readonly badge: BadgeService,
  ) {}

  @Post("study/event")
  @Authenticated()
  async recordEvent(
    @CurrentUser() user: JwtUser,
    @Body() dto: RecordActivityDto,
  ) {
    const userId = user.sub;
    const result = await this.studyTime.recordActivity(userId, dto);
    await this.streak.evaluateStreak(userId);
    await this.badge.evaluateBadges(userId);
    return result;
  }

  @Get("study/summary")
  @Authenticated()
  async summary(
    @CurrentUser() user: JwtUser,
    @Query("days") days?: string,
    @Query("batchId") batchId?: string,
  ) {
    return this.studyTime.getSummary(user.sub, {
      days: days !== undefined ? Number(days) : undefined,
      batchId,
    });
  }

  @Get("goal")
  @Authenticated()
  async getGoal(@CurrentUser() user: JwtUser) {
    return this.streak.getGoal(user.sub);
  }

  @Put("goal")
  @Authenticated()
  async setGoal(@CurrentUser() user: JwtUser, @Body() dto: SetGoalDto) {
    return this.streak.setGoal(user.sub, dto.dailyGoalMinutes);
  }

  @Get("streak")
  @Authenticated()
  async getStreak(@CurrentUser() user: JwtUser) {
    return this.streak.getStreak(user.sub);
  }

  @Get("badges")
  @Authenticated()
  async listBadges(@CurrentUser() user: JwtUser) {
    return this.badge.listBadges(user.sub);
  }
}
