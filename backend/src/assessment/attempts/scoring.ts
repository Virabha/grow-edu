import { QuestionAnswerKey, QuestionOption } from "../../database/schema";
import {
  PartialCreditRule,
  ToleranceKind,
} from "../bank/dto/question.dto";

export type ScoredOutcome = "CORRECT" | "PARTIAL" | "WRONG" | "SKIPPED";

export interface ToleranceSpec {
  kind: ToleranceKind;
  value: number;
}

export interface ScorableQuestion {
  options: QuestionOption[];
  answerKey: QuestionAnswerKey | null;
  partialCreditRule: PartialCreditRule | null;
  tolerance: ToleranceSpec | null;
}

export function toleranceFrom(
  kind: ToleranceKind | null,
  value: string | null,
): ToleranceSpec | null {
  if (kind === null) return null;
  const parsed = value === null ? 0 : Math.abs(Number(value));
  if (!Number.isFinite(parsed)) return null;
  return { kind, value: parsed };
}

export interface ScorablePlacement {
  marks: number;
  negativeMarkPercent: number;
}

export interface AnswerScore {
  outcome: ScoredOutcome;
  awarded: number;
}

const SKIPPED: AnswerScore = { outcome: "SKIPPED", awarded: 0 };

export function isBlank(response: unknown): boolean {
  if (response === undefined || response === null || response === "") {
    return true;
  }
  return Array.isArray(response) && response.length === 0;
}

export function scoreAnswer(
  question: ScorableQuestion,
  placement: ScorablePlacement,
  response: unknown,
): AnswerScore {
  if (isBlank(response)) return SKIPPED;

  const penalty = -(placement.marks * placement.negativeMarkPercent) / 100;
  const wrong: AnswerScore = { outcome: "WRONG", awarded: round(penalty) };
  const correct: AnswerScore = {
    outcome: "CORRECT",
    awarded: round(placement.marks),
  };

  const key = question.answerKey;
  if (!key) return wrong;

  if (key.kind === "SINGLE") {
    return response === key.optionId ? correct : wrong;
  }

  if (key.kind === "NUMERIC") {
    return withinTolerance(question, key.value, response) ? correct : wrong;
  }

  return scoreMultiple(question, placement, key.optionIds, response, wrong, correct);
}

function scoreMultiple(
  question: ScorableQuestion,
  placement: ScorablePlacement,
  correctIds: string[],
  response: unknown,
  wrong: AnswerScore,
  correct: AnswerScore,
): AnswerScore {
  if (!Array.isArray(response)) return wrong;

  const selected = new Set<string>();
  for (const entry of response) {
    if (typeof entry !== "string") return wrong;
    selected.add(entry);
  }
  if (selected.size === 0) return wrong;

  const expected = new Set(correctIds);
  const chosenCorrect = [...selected].filter((id) => expected.has(id)).length;
  const chosenWrong = selected.size - chosenCorrect;

  if (chosenWrong === 0 && chosenCorrect === expected.size) return correct;

  if (question.partialCreditRule !== "PROPORTIONAL") return wrong;
  if (chosenWrong > 0) return wrong;

  const share = chosenCorrect / expected.size;
  return {
    outcome: "PARTIAL",
    awarded: round(Math.min(placement.marks * share, placement.marks)),
  };
}

function withinTolerance(
  question: ScorableQuestion,
  expected: number,
  response: unknown,
): boolean {
  const given =
    typeof response === "number"
      ? response
      : typeof response === "string" && response.trim() !== ""
        ? Number(response)
        : Number.NaN;

  if (!Number.isFinite(given)) return false;

  const tolerance = question.tolerance;
  const allowed =
    tolerance === null
      ? 0
      : tolerance.kind === "RELATIVE"
        ? tolerance.value * Math.abs(expected)
        : tolerance.value;

  return Math.abs(given - expected) <= allowed + Number.EPSILON;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export function clampToFloor(total: number, floor: number): number {
  return round(Math.max(total, floor));
}
