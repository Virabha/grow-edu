import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PublicPortfolioService } from './public-portfolio.service';
import type { PublicPortfolio } from './portfolio-projection';

@Controller('portfolio')
export class PublicPortfolioController {
  constructor(private readonly publicPortfolioService: PublicPortfolioService) {}

  @Public()
  @Get(':handle')
  async getByHandle(@Param('handle') handle: string): Promise<PublicPortfolio> {
    const portfolio = await this.publicPortfolioService.getByHandle(handle);
    if (!portfolio) throw new NotFoundException();
    return portfolio;
  }
}
