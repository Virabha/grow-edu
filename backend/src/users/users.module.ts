import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [DatabaseModule, EmailModule, FilesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

