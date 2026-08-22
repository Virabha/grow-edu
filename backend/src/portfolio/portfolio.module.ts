import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PublicPortfolioController } from './public-portfolio.controller';
import { PublicPortfolioService } from './public-portfolio.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PortfolioController, PublicPortfolioController],
  providers: [PortfolioService, PublicPortfolioService],
})
export class PortfolioModule {}
