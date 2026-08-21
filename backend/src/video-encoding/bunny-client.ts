import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config';

export const BUNNY_CLIENT = 'BUNNY_CLIENT';

export interface BunnyVideoData {
  guid: string;
}

export interface BunnyVideoStatus {
  status: number;
  encodeProgress: number;
  length: number;
}

export interface BunnyClient {
  createVideo(libraryId: string, title: string): Promise<BunnyVideoData>;
  getVideoStatus(libraryId: string, videoId: string): Promise<BunnyVideoStatus>;
}

@Injectable()
export class HttpBunnyClient implements BunnyClient {
  private readonly baseUrl = 'https://video.bunnycdn.com';

  constructor(private readonly config: AppConfigService) {}

  async createVideo(libraryId: string, title: string): Promise<BunnyVideoData> {
    const response = await fetch(`${this.baseUrl}/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        AccessKey: this.config.bunnyStreamApiKey ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Bunny createVideo failed (${response.status}): ${body}`);
    }
    return response.json() as Promise<BunnyVideoData>;
  }

  async getVideoStatus(libraryId: string, videoId: string): Promise<BunnyVideoStatus> {
    const response = await fetch(
      `${this.baseUrl}/library/${libraryId}/videos/${videoId}`,
      { headers: { AccessKey: this.config.bunnyStreamApiKey ?? '' } },
    );
    if (!response.ok) {
      throw new Error(`Bunny getVideoStatus failed (${response.status})`);
    }
    return response.json() as Promise<BunnyVideoStatus>;
  }
}
