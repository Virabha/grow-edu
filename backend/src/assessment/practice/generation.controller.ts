import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles, UserRole } from '../../auth/decorators/roles.decorator';
import { GenerationCriteriaDto } from './dto/generation.dto';
import { GenerationService } from './generation.service';

interface AuthedUser {
  userId: string;
}

@ApiTags('assessment')
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
@Controller('assessment/practice')
export class GenerationController {
  constructor(private readonly generation: GenerationService) {}

  @ApiOperation({ summary: 'Generate a test from criteria (topic + difficulty counts)' })
  @Post('generate')
  async generate(
    @Body() dto: GenerationCriteriaDto,
    @CurrentUser() user: AuthedUser,
  ) {
    const excludeQuestionIds = dto.excludeStudentId
      ? await this.generation.recentlyServedIds(dto.excludeStudentId)
      : [];

    return this.generation.generate(
      {
        topicCounts: dto.topicCounts,
        difficultyCounts: dto.difficultyCounts,
        excludeRetired: true,
        excludeQuestionIds,
      },
      user.userId,
      dto.batchId,
    );
  }
}
