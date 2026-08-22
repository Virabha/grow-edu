import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { CatalogueController } from './catalogue.controller';
import { CatalogueService } from './catalogue.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchSyncService } from './search-sync.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [DatabaseModule, SettingsModule],
  controllers: [
    CatalogueController,
    SearchController,
    WishlistController,
    GoalController,
    RecommendationController,
  ],
  providers: [
    CatalogueService,
    SearchService,
    SearchSyncService,
    WishlistService,
    GoalService,
    RecommendationService,
  ],
  exports: [GoalService],
})
export class DiscoveryModule {}
