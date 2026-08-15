import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BrandsController } from './brands/brands.controller';
import { BrandsService } from './brands/brands.service';
import { BadgesController } from './badges/badges.controller';
import { BadgesService } from './badges/badges.service';
import { SocialLinksController } from './social-links/social-links.controller';
import { SocialLinksService } from './social-links/social-links.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BrandsController, BadgesController, SocialLinksController],
  providers: [BrandsService, BadgesService, SocialLinksService],
})
export class AdminResourcesModule {}
