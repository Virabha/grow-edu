import { Module } from '@nestjs/common';
import { VideoEncodingService } from './video-encoding.service';
import { VideoEncodingController } from './video-encoding.controller';
import { VideoEncodingWebhookController } from './video-encoding.webhook.controller';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { AppConfigModule } from '../config';
import { BUNNY_CLIENT, HttpBunnyClient } from './bunny-client';

@Module({
  imports: [DatabaseModule, EmailModule, AppConfigModule],
  controllers: [VideoEncodingController, VideoEncodingWebhookController],
  providers: [
    VideoEncodingService,
    { provide: BUNNY_CLIENT, useClass: HttpBunnyClient },
  ],
  exports: [VideoEncodingService, BUNNY_CLIENT],
})
export class VideoEncodingModule {}
