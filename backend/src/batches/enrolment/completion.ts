export type LessonKind =
  | "VIDEO"
  | "TEXT"
  | "QUIZ"
  | "DOCUMENT"
  | "AUDIO"
  | "RICH"
  | "LIVE_SESSION";

export interface CompletionThresholds {
  videoWatchedPercent: number;
  audioListenedPercent: number;
  documentPagesPercent: number;
  richBlocksPercent: number;
  liveSessionMinAttendanceSeconds: number;
}

export const COMPLETION_DEFAULTS: CompletionThresholds = {
  videoWatchedPercent: 90,
  audioListenedPercent: 90,
  documentPagesPercent: 80,
  richBlocksPercent: 100,
  liveSessionMinAttendanceSeconds: 300,
};

export interface CompletionInput {
  type: LessonKind;
  watchedSeconds: number;
  listenedSeconds: number;
  pagesViewed: number;
  durationSeconds: number | null;
  audioDurationSeconds: number | null;
  pageCount: number | null;
  blockCount: number | null;
  quizSubmitted: boolean;
  attendanceSeconds: number;
  markedComplete: boolean;
}

function measurable(total: number | null): total is number {
  return total !== null && total > 0;
}

function reached(progress: number, total: number, percent: number): boolean {
  return (progress / total) * 100 >= percent;
}

export function isComplete(
  input: CompletionInput,
  thresholds: CompletionThresholds,
): boolean {
  switch (input.type) {
    case "VIDEO":
      return measurable(input.durationSeconds)
        ? reached(
            input.watchedSeconds,
            input.durationSeconds,
            thresholds.videoWatchedPercent,
          )
        : input.markedComplete;
    case "AUDIO":
      return measurable(input.audioDurationSeconds)
        ? reached(
            input.listenedSeconds,
            input.audioDurationSeconds,
            thresholds.audioListenedPercent,
          )
        : input.markedComplete;
    case "DOCUMENT":
      return measurable(input.pageCount)
        ? reached(
            input.pagesViewed,
            input.pageCount,
            thresholds.documentPagesPercent,
          )
        : input.markedComplete;
    case "RICH":
      return measurable(input.blockCount)
        ? reached(
            input.pagesViewed,
            input.blockCount,
            thresholds.richBlocksPercent,
          )
        : input.markedComplete;
    case "QUIZ":
      return input.quizSubmitted;
    case "LIVE_SESSION":
      return (
        input.attendanceSeconds >= thresholds.liveSessionMinAttendanceSeconds
      );
    case "TEXT":
      return input.markedComplete;
  }
}

export function honoursClientCompletion(
  type: LessonKind,
  durationSeconds: number | null,
  audioDurationSeconds: number | null,
  pageCount: number | null,
  blockCount: number | null,
): boolean {
  switch (type) {
    case "VIDEO":
      return !measurable(durationSeconds);
    case "AUDIO":
      return !measurable(audioDurationSeconds);
    case "DOCUMENT":
      return !measurable(pageCount);
    case "RICH":
      return !measurable(blockCount);
    case "QUIZ":
    case "LIVE_SESSION":
      return false;
    case "TEXT":
      return true;
  }
}

export function clampPosition(
  position: number,
  durationSeconds: number | null,
): number {
  if (position < 0) return 0;
  if (!measurable(durationSeconds)) return position;
  return Math.min(position, durationSeconds);
}

export function readThresholds(
  values: Record<string, string | number | boolean | null>,
): CompletionThresholds {
  const read = (key: keyof CompletionThresholds): number => {
    const configured = Number(values[key]);
    return Number.isFinite(configured) && configured >= 0
      ? configured
      : COMPLETION_DEFAULTS[key];
  };
  return {
    videoWatchedPercent: read("videoWatchedPercent"),
    audioListenedPercent: read("audioListenedPercent"),
    documentPagesPercent: read("documentPagesPercent"),
    richBlocksPercent: read("richBlocksPercent"),
    liveSessionMinAttendanceSeconds: read("liveSessionMinAttendanceSeconds"),
  };
}
