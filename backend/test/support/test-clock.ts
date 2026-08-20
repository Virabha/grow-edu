import { Clock } from '../../src/common/clock';

export class TestClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date()) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  epochMillis(): number {
    return this.current.getTime();
  }

  set(when: Date | string): void {
    this.current = typeof when === 'string' ? new Date(when) : new Date(when.getTime());
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }

  reset(): void {
    this.current = new Date();
  }
}
