import { Injectable } from "@nestjs/common";

export const RECORDING_PROVIDER = "RECORDING_PROVIDER";

export interface EndedSession {
  sessionId: string;
  batchId: string;
  liveProvider: string | null;
  joinUrl: string | null;
  scheduledEndAt: Date | null;
}

export interface ProviderRecording {
  videoId: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  attendeeUserIds?: string[];
}

export interface RecordingProvider {
  findRecording(session: EndedSession): Promise<ProviderRecording | null>;
}

@Injectable()
export class NoRecordingProvider implements RecordingProvider {
  async findRecording(): Promise<ProviderRecording | null> {
    return null;
  }
}
