import { ExecutionCaseOutcome, ProviderOutcome } from "./execution-provider";

export type CodingVerdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR"
  | "INTERNAL_ERROR";

const OUTCOME_TO_VERDICT: Record<ProviderOutcome, CodingVerdict> = {
  OK: "ACCEPTED",
  WRONG_OUTPUT: "WRONG_ANSWER",
  TIMEOUT: "TIME_LIMIT_EXCEEDED",
  OUT_OF_MEMORY: "MEMORY_LIMIT_EXCEEDED",
  RUNTIME_FAULT: "RUNTIME_ERROR",
  COMPILE_FAILURE: "COMPILATION_ERROR",
};

export function verdictForOutcome(outcome: string): CodingVerdict {
  const known = Object.prototype.hasOwnProperty.call(
    OUTCOME_TO_VERDICT,
    outcome,
  );
  if (!known) return "INTERNAL_ERROR";
  return OUTCOME_TO_VERDICT[outcome as ProviderOutcome];
}

export function isStudentFault(verdict: CodingVerdict): boolean {
  return verdict !== "ACCEPTED" && verdict !== "INTERNAL_ERROR";
}

export interface JudgedRun {
  verdict: CodingVerdict;
  failedOrdinal: number | null;
  runtimeMs: number;
  memoryKb: number;
}

export function judge(outcomes: ExecutionCaseOutcome[]): JudgedRun {
  if (outcomes.length === 0) {
    return {
      verdict: "INTERNAL_ERROR",
      failedOrdinal: null,
      runtimeMs: 0,
      memoryKb: 0,
    };
  }

  const ordered = [...outcomes].sort((a, b) => a.ordinal - b.ordinal);
  const runtimeMs = Math.max(...ordered.map((o) => o.runtimeMs || 0));
  const memoryKb = Math.max(...ordered.map((o) => o.memoryKb || 0));

  for (const outcome of ordered) {
    const verdict = verdictForOutcome(outcome.outcome);
    if (verdict === "ACCEPTED") continue;
    return {
      verdict,
      failedOrdinal: outcome.ordinal,
      runtimeMs,
      memoryKb,
    };
  }

  return { verdict: "ACCEPTED", failedOrdinal: null, runtimeMs, memoryKb };
}

const SAFE_FAILURE_DETAIL: Record<CodingVerdict, string> = {
  ACCEPTED: "All tests passed",
  WRONG_ANSWER: "Your output did not match the expected output",
  TIME_LIMIT_EXCEEDED: "Your solution exceeded the time limit",
  MEMORY_LIMIT_EXCEEDED: "Your solution exceeded the memory limit",
  RUNTIME_ERROR: "Your solution failed while running",
  COMPILATION_ERROR: "Your solution did not compile",
  INTERNAL_ERROR: "We could not run your code. This is our fault, not yours.",
};

export function safeDetailFor(verdict: CodingVerdict): string {
  return SAFE_FAILURE_DETAIL[verdict];
}

export function scrubCompilerOutput(
  message: string,
  secrets: string[],
): string {
  let scrubbed = message;
  for (const secret of secrets) {
    const trimmed = secret.trim();
    if (trimmed.length === 0) continue;
    let index = scrubbed.toLowerCase().indexOf(trimmed.toLowerCase());
    while (index !== -1) {
      scrubbed =
        scrubbed.slice(0, index) +
        "[redacted]" +
        scrubbed.slice(index + trimmed.length);
      index = scrubbed.toLowerCase().indexOf(trimmed.toLowerCase());
    }
  }
  return scrubbed;
}
