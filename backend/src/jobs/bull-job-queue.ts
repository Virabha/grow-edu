import {
  Injectable,
  Logger,
  OnApplicationShutdown,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";

import {
  DEFAULT_ATTEMPTS,
  JobHandler,
  JobOptions,
  JobQueue,
} from "./job-queue";

const QUEUE_NAME = "groedu";

@Injectable()
export class BullJobQueue implements JobQueue, OnApplicationShutdown {
  private readonly logger = new Logger(BullJobQueue.name);
  private readonly handlers = new Map<string, JobHandler<unknown>>();
  private readonly attempts = new Map<string, number>();
  private readonly queue: Queue;
  private worker: Worker | null = null;

  constructor(private readonly connectionUrl: string) {
    this.queue = new Queue(QUEUE_NAME, {
      connection: { url: this.connectionUrl },
    });
  }

  register<T>(name: string, handler: JobHandler<T>, options?: JobOptions): void {
    this.handlers.set(name, handler as JobHandler<unknown>);
    this.attempts.set(name, options?.attempts ?? DEFAULT_ATTEMPTS);
    this.ensureWorker();
  }

  async enqueue<T>(name: string, payload: T): Promise<void> {
    await this.queue.add(name, payload, {
      attempts: this.attempts.get(name) ?? DEFAULT_ATTEMPTS,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async repeat(name: string, everyMilliseconds: number): Promise<void> {
    await this.queue.upsertJobScheduler(
      name,
      { every: everyMilliseconds },
      {
        name,
        opts: {
          attempts: this.attempts.get(name) ?? DEFAULT_ATTEMPTS,
          removeOnComplete: true,
        },
      },
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
  }

  private ensureWorker(): void {
    if (this.worker) return;
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const handler = this.handlers.get(job.name);
        if (!handler) {
          this.logger.warn(`No handler registered for job "${job.name}"`);
          return;
        }
        await handler(job.data);
      },
      { connection: { url: this.connectionUrl } },
    );
    this.worker.on("failed", (job, error) => {
      this.logger.error(`Job "${job?.name}" failed: ${error.message}`);
    });
  }
}
