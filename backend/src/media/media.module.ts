import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BatchesModule } from '../batches/batches.module';
import { SettingsModule } from '../settings/settings.module';
import { TRANSCRIPTION_PROVIDER, NullTranscriptionProvider } from './transcription-provider';
import { TranscriptService } from './transcript.service';
import { TranscriptController } from './transcript.controller';
import { LowBandwidthService } from './low-bandwidth.service';
import { LowBandwidthController } from './low-bandwidth.controller';

@Module({
  imports: [DatabaseModule, BatchesModule, SettingsModule],
  controllers: [TranscriptController, LowBandwidthController],
  providers: [
    TranscriptService,
    LowBandwidthService,
    { provide: TRANSCRIPTION_PROVIDER, useClass: NullTranscriptionProvider },
  ],
  exports: [TranscriptService, LowBandwidthService, TRANSCRIPTION_PROVIDER],
})
export class MediaModule {}
