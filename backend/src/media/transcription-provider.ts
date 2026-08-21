import { Injectable } from '@nestjs/common';

export const TRANSCRIPTION_PROVIDER = 'TRANSCRIPTION_PROVIDER';

export interface TranscriptSegmentData {
  ordinal: number;
  startSeconds: number;
  endSeconds: number;
  body: string;
}

export interface TranscriptionProvider {
  transcribe(sourceKey: string, language: string): Promise<TranscriptSegmentData[]>;
}

@Injectable()
export class NullTranscriptionProvider implements TranscriptionProvider {
  async transcribe(): Promise<TranscriptSegmentData[]> {
    return [];
  }
}
