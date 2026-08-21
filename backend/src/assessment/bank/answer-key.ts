import { BadRequestException } from "@nestjs/common";

import { QuestionAnswerKey, QuestionOption } from "../../database/schema";
import { PartialCreditRule, QuestionType, ToleranceKind } from "./dto/question.dto";

export interface ScoringShape {
  options: QuestionOption[];
  answerKey: QuestionAnswerKey | null;
  partialCreditRule: PartialCreditRule | null;
  toleranceKind: ToleranceKind | null;
  tolerance: string | null;
}

export function isHumanGraded(type: QuestionType): boolean {
  return type === "WRITTEN" || type === "IMAGE_UPLOAD";
}

export function buildScoringShape(
  type: QuestionType,
  options: QuestionOption[],
  rawAnswerKey: Record<string, unknown> | undefined,
  partialCreditRule: PartialCreditRule | undefined,
  toleranceKind: ToleranceKind | undefined,
  tolerance: number | undefined,
): ScoringShape {
  if (isHumanGraded(type)) {
    if (rawAnswerKey) {
      throw new BadRequestException(
        `A ${type} question is graded by a person and cannot carry an answer key`,
      );
    }
    if (options.length > 0) {
      throw new BadRequestException(`A ${type} question cannot carry options`);
    }
    return {
      options: [],
      answerKey: null,
      partialCreditRule: null,
      toleranceKind: null,
      tolerance: null,
    };
  }

  if (!rawAnswerKey) {
    throw new BadRequestException(`A ${type} question needs an answer key`);
  }

  if (type === "NUMERIC") {
    if (options.length > 0) {
      throw new BadRequestException("A NUMERIC question cannot carry options");
    }
    const value = rawAnswerKey.value;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new BadRequestException("answerKey.value must be a finite number");
    }
    return {
      options: [],
      answerKey: { kind: "NUMERIC", value },
      partialCreditRule: null,
      toleranceKind: toleranceKind ?? "ABSOLUTE",
      tolerance: (tolerance ?? 0).toString(),
    };
  }

  if (options.length < 2) {
    throw new BadRequestException(`A ${type} question needs at least 2 options`);
  }
  const ids = new Set(options.map((option) => option.id));

  if (type === "SINGLE_CORRECT") {
    const optionId = rawAnswerKey.optionId;
    if (typeof optionId !== "string" || !ids.has(optionId)) {
      throw new BadRequestException(
        "answerKey.optionId must name one of the options",
      );
    }
    return {
      options,
      answerKey: { kind: "SINGLE", optionId },
      partialCreditRule: null,
      toleranceKind: null,
      tolerance: null,
    };
  }

  const optionIds = rawAnswerKey.optionIds;
  if (
    !Array.isArray(optionIds) ||
    optionIds.length === 0 ||
    !optionIds.every((id) => typeof id === "string" && ids.has(id))
  ) {
    throw new BadRequestException(
      "answerKey.optionIds must be a non-empty list of option ids",
    );
  }
  if (new Set(optionIds).size !== optionIds.length) {
    throw new BadRequestException("answerKey.optionIds must be distinct");
  }
  if (optionIds.length === options.length) {
    throw new BadRequestException(
      "A MULTIPLE_CORRECT question cannot have every option correct",
    );
  }

  return {
    options,
    answerKey: { kind: "MULTIPLE", optionIds: optionIds as string[] },
    partialCreditRule: partialCreditRule ?? "ALL_OR_NOTHING",
    toleranceKind: null,
    tolerance: null,
  };
}
