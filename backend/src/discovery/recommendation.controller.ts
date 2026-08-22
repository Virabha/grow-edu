import { Controller, Get } from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecommendationService } from './recommendation.service';

interface AuthedUser { userId: string; role: string; }

@Controller('me/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Authenticated()
  @Get()
  get(@CurrentUser() user: AuthedUser) {
    return this.recommendationService.forUser(user.userId);
  }
}
