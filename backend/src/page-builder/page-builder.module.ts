import { Module } from '@nestjs/common';
import { PageBuilderController } from './page-builder.controller';
import { PageBuilderService } from './page-builder.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PageBuilderController],
  providers: [PageBuilderService],
})
export class PageBuilderModule {}
