import { BadRequestException } from "@nestjs/common";

import { parseContent } from "../../assessment/bank/content";
import { isRecord } from "../../assessment/shared/type-guards";
import { RichLessonBlock } from "../../database/schema";

const EXTRA_BLOCK_TYPES = ["TABLE", "QUESTION"];

function parseTable(raw: Record<string, unknown>, where: string): RichLessonBlock {
  const headers = raw.headers;
  const rows = raw.rows;
  if (
    !Array.isArray(headers) ||
    headers.some((header) => typeof header !== "string")
  ) {
    throw new BadRequestException(`${where}: headers must be an array of strings`);
  }
  if (!Array.isArray(rows)) {
    throw new BadRequestException(`${where}: rows must be an array`);
  }
  const parsedRows = rows.map((row, index) => {
    if (!Array.isArray(row) || row.some((cell) => typeof cell !== "string")) {
      throw new BadRequestException(
        `${where}.rows[${index}]: a row must be an array of strings`,
      );
    }
    if (row.length !== headers.length) {
      throw new BadRequestException(
        `${where}.rows[${index}]: a row must have ${headers.length} cells`,
      );
    }
    return row.map(String);
  });
  return { type: "TABLE", headers: headers.map(String), rows: parsedRows };
}

function parseQuestion(
  raw: Record<string, unknown>,
  where: string,
): RichLessonBlock {
  const questionId = raw.questionId;
  if (typeof questionId !== "string" || questionId.length === 0) {
    throw new BadRequestException(
      `${where}: questionId must be a non-empty string`,
    );
  }
  if ("prompt" in raw || "options" in raw || "answerKey" in raw) {
    throw new BadRequestException(
      `${where}: an inline question references a bank question and cannot embed a copy`,
    );
  }
  return { type: "QUESTION", questionId };
}

export function parseRichBlocks(raw: unknown, where: string): RichLessonBlock[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException(`${where}: content must be an array of blocks`);
  }
  if (raw.length === 0) {
    throw new BadRequestException(`${where}: content cannot be empty`);
  }
  return raw.map((block, index) => {
    const at = `${where}[${index}]`;
    if (!isRecord(block)) {
      throw new BadRequestException(`${at}: a content block must be an object`);
    }
    const type = block.type;
    if (typeof type === "string" && EXTRA_BLOCK_TYPES.includes(type)) {
      return type === "TABLE" ? parseTable(block, at) : parseQuestion(block, at);
    }
    const [parsed] = parseContent([block], at);
    return parsed;
  });
}

export function inlineQuestionIds(blocks: RichLessonBlock[]): string[] {
  const ids = blocks
    .filter(
      (block): block is { type: "QUESTION"; questionId: string } =>
        block.type === "QUESTION",
    )
    .map((block) => block.questionId);
  return [...new Set(ids)];
}
