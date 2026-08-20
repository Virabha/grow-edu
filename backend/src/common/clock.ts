import { Global, Injectable, Module } from "@nestjs/common";

export const CLOCK = "CLOCK";

export interface Clock {
  now(): Date;
  epochMillis(): number;
}

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  epochMillis(): number {
    return Date.now();
  }
}

@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class ClockModule {}
