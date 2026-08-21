import { Inject, Injectable, Logger } from "@nestjs/common";

import { CLOCK, Clock } from "../common/clock";
import {
  DEFAULT_ATTEMPTS,
  JobHandler,
  JobOptions,
  JobQueue,
} from "./job-queue";

type Registration = {
  handler: JobHandler<unknown>;
  attempts: number;
};

type Repeatable = {
  everyMilliseconds: number;
  nextDueAt: number;
};

@Injectable()
export class InlineJobQueue implements JobQueue {
  private readonly logger = new Logger(InlineJobQueue.name);
  private readonly registrations = new Map<string, Registration>();
  private readonly repeatables = new Map<string, Repeatable>();
  private readonly failures = new Map<string, number>();

  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  register<T>(name: string, handler: JobHandler<T>, options?: JobOptions): void {
    this.registrations.set(name, {
      handler: handler as JobHandler<unknown>,
      attempts: options?.attempts ?? DEFAULT_ATTEMPTS,
    });
  }

  async enqueue<T>(name: string, payload: T): Promise<void> {
    const registration = this.registrations.get(name);
    if (!registration) {
      this.logger.warn(`No handler registered for job "${name}"`);
      return;
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= registration.attempts; attempt += 1) {
      try {
        await registration.handler(payload);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    this.failures.set(name, (this.failures.get(name) ?? 0) + 1);
    this.logger.error(
      `Job "${name}" failed after ${registration.attempts} attempts: ${String(lastError)}`,
    );
  }

  async repeat(name: string, everyMilliseconds: number): Promise<void> {
    this.repeatables.set(name, {
      everyMilliseconds,
      nextDueAt: this.clock.epochMillis() + everyMilliseconds,
    });
  }

  async tick(): Promise<string[]> {
    const now = this.clock.epochMillis();
    const fired: string[] = [];

    for (const [name, repeatable] of this.repeatables) {
      if (repeatable.nextDueAt > now) continue;
      fired.push(name);
      repeatable.nextDueAt = now + repeatable.everyMilliseconds;
      await this.enqueue(name, undefined);
    }

    return fired;
  }

  failureCount(name: string): number {
    return this.failures.get(name) ?? 0;
  }

  attemptsFor(name: string): number {
    return this.registrations.get(name)?.attempts ?? 0;
  }
}
