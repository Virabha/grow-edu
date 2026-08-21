import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { createHash } from 'node:crypto';

@Injectable()
export class PerTokenThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req.body as { token?: unknown } | undefined;
    if (typeof body?.token === 'string' && body.token.length > 0) {
      return createHash('sha256').update(body.token).digest('hex');
    }
    return typeof req.ip === 'string' ? req.ip : 'unknown';
  }
}
