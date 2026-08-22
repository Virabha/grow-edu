import { Body, Controller, Get, Put } from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { GoalService } from './goal.service';
import { SaveGoalDto } from './dto/save-goal.dto';

interface AuthedUser { userId: string; role: string; }

@Controller('me/goal')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Authenticated()
  @Get()
  get(@CurrentUser() user: AuthedUser) {
    return this.goalService.getStudentGoal(user.userId);
  }

  @Authenticated()
  @Put()
  set(@CurrentUser() user: AuthedUser, @Body() dto: SaveGoalDto) {
    return this.goalService.setGoal(user.userId, dto.goalKey);
  }

  @Public()
  @Get('options')
  options() {
    return this.goalService.getGoalOptions();
  }
}
