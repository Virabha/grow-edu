import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PortfolioService } from './portfolio.service';
import { UpsertPortfolioDto } from './dto/upsert-portfolio.dto';
import { PublishItemDto } from './dto/publish-item.dto';

interface AuthenticatedUser {
  userId: string;
}

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Authenticated()
  @Put('me')
  async upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertPortfolioDto,
  ): Promise<void> {
    await this.portfolioService.upsert(user.userId, dto);
  }

  @Authenticated()
  @Put('me/publish')
  async publish(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.portfolioService.setPublished(user.userId, true);
  }

  @Authenticated()
  @Delete('me/publish')
  async unpublish(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.portfolioService.setPublished(user.userId, false);
  }

  @Authenticated()
  @Post('me/items')
  async publishItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PublishItemDto,
  ): Promise<{ itemId: string }> {
    return this.portfolioService.publishItem(user.userId, dto);
  }

  @Authenticated()
  @Delete('me/items/:itemId')
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.portfolioService.removeItem(user.userId, itemId);
  }
}
