export const JOB_QUEUE = "JOB_QUEUE";

export type JobHandler<T> = (payload: T) => Promise<void>;

export interface JobOptions {
  attempts?: number;
}

export interface JobQueue {
  register<T>(name: string, handler: JobHandler<T>, options?: JobOptions): void;
  enqueue<T>(name: string, payload: T): Promise<void>;
  repeat(name: string, everyMilliseconds: number): Promise<void>;
}

export const DEFAULT_ATTEMPTS = 3;
