import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { QuestionImportController } from './question-import.controller';
import { QuestionImportService } from './question-import.service';

@Module({
  imports: [DatabaseModule, TaxonomyModule],
  controllers: [QuestionImportController],
  providers: [QuestionImportService],
  exports: [QuestionImportService],
})
export class ImportModule {}
