import { BadRequestException } from "@nestjs/common";

import { ContentBlock, QuestionOption } from "../../database/schema";

const BLOCK_TYPES = ["TEXT", "MATH", "CODE", "IMAGE"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  block: Record<string, unknown>,
  field: string,
  where: string,
): string {
  const value = block[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${where}: ${field} must be a non-empty string`);
  }
  return value;
}

function parseBlock(raw: unknown, where: string): ContentBlock {
  if (!isRecord(raw)) {
    throw new BadRequestException(`${where}: a content block must be an object`);
  }

  const type = raw.type;
  if (typeof type !== "string" || !BLOCK_TYPES.includes(type)) {
    throw new BadRequestException(
      `${where}: unknown content block type ${String(type)}`,
    );
  }

  if (type === "TEXT") {
    return { type: "TEXT", text: requireString(raw, "text", where) };
  }
  if (type === "MATH") {
    return { type: "MATH", latex: requireString(raw, "latex", where) };
  }
  if (type === "CODE") {
    return {
      type: "CODE",
      language: requireString(raw, "language", where),
      code: requireString(raw, "code", where),
    };
  }

  const alt = raw.alt;
  if (alt !== undefined && typeof alt !== "string") {
    throw new BadRequestException(`${where}: alt must be a string`);
  }
  return {
    type: "IMAGE",
    fileId: requireString(raw, "fileId", where),
    ...(alt === undefined ? {} : { alt }),
  };
}

export function parseContent(
  raw: unknown,
  where: string,
  { allowEmpty = false } = {},
): ContentBlock[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException(`${where}: content must be an array of blocks`);
  }
  if (raw.length === 0 && !allowEmpty) {
    throw new BadRequestException(`${where}: content cannot be empty`);
  }
  return raw.map((block, index) => parseBlock(block, `${where}[${index}]`));
}

export function parseOptions(
  raw: unknown,
  where: string,
): QuestionOption[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException(`${where}: options must be an array`);
  }

  const options = raw.map((option, index) => {
    const at = `${where}[${index}]`;
    if (!isRecord(option)) {
      throw new BadRequestException(`${at}: an option must be an object`);
    }
    return {
      id: requireString(option, "id", at),
      content: parseContent(option.content, `${at}.content`),
    };
  });

  const ids = new Set(options.map((option) => option.id));
  if (ids.size !== options.length) {
    throw new BadRequestException(`${where}: option ids must be distinct`);
  }

  return options;
}

export function contentToSearchText(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "TEXT") return block.text;
      if (block.type === "MATH") return block.latex;
      if (block.type === "CODE") return block.code;
      return block.alt ?? "";
    })
    .join(" ")
    .trim();
}
