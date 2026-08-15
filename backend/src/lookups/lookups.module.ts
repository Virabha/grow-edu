import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SiteLanguagesController } from './site-languages.controller';
import { SiteLanguagesService } from './site-languages.service';
import { CourseLanguagesController } from './course-languages.controller';
import { CourseLanguagesService } from './course-languages.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    SiteLanguagesController,
    CourseLanguagesController,
    LocationsController,
    CurrenciesController,
  ],
  providers: [
    SiteLanguagesService,
    CourseLanguagesService,
    LocationsService,
    CurrenciesService,
  ],
})
export class LookupsModule {}
