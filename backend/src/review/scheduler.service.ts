import { Injectable } from '@nestjs/common';

type ReviewState = {
  intervalDays: number;
  easeFactor: string;
  repetitionCount: number;
  lapseCount: number;
};

type ReviewSchedule = ReviewState & { dueAt: Date };

@Injectable()
export class SchedulerService {
  private static readonly INITIAL_EASE = 2.5;
  private static readonly MIN_EASE = 1.3;
  private static readonly EASE_CORRECT_DELTA = 0.1;
  private static readonly EASE_WRONG_DELTA = 0.2;
  private static readonly MILLIS_PER_DAY = 86_400_000;

  initialState(now: Date): ReviewSchedule {
    return {
      intervalDays: 1,
      easeFactor: SchedulerService.INITIAL_EASE.toFixed(2),
      repetitionCount: 0,
      lapseCount: 0,
      dueAt: now,
    };
  }

  schedule(item: ReviewState, outcome: 'CORRECT' | 'WRONG', now: Date): ReviewSchedule {
    const ease = parseFloat(item.easeFactor);

    if (outcome === 'CORRECT') {
      const newRep = item.repetitionCount + 1;
      let interval: number;
      if (newRep === 1) interval = 1;
      else if (newRep === 2) interval = 6;
      else interval = Math.round(item.intervalDays * ease);
      const newEase = Math.min(9.99, ease + SchedulerService.EASE_CORRECT_DELTA);
      return {
        intervalDays: interval,
        easeFactor: newEase.toFixed(2),
        repetitionCount: newRep,
        lapseCount: item.lapseCount,
        dueAt: new Date(now.getTime() + interval * SchedulerService.MILLIS_PER_DAY),
      };
    }

    const newEase = Math.max(SchedulerService.MIN_EASE, ease - SchedulerService.EASE_WRONG_DELTA);
    return {
      intervalDays: 1,
      easeFactor: newEase.toFixed(2),
      repetitionCount: 0,
      lapseCount: item.lapseCount + 1,
      dueAt: new Date(now.getTime() + SchedulerService.MILLIS_PER_DAY),
    };
  }
}
