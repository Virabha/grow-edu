export class StructuredOutputRejected extends Error {
  constructor(readonly reason: string) {
    super(`Model output rejected: ${reason}`);
    this.name = "StructuredOutputRejected";
  }
}

type Primitive = "string" | "number" | "integer" | "boolean";

export interface FieldSpec {
  type: Primitive | "array" | "object";
  items?: FieldSpec;
  fields?: Record<string, FieldSpec>;
  optional?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  enum?: string[];
}

function describe(path: string): string {
  return path.length === 0 ? "the response" : `"${path}"`;
}

function checkPrimitive(value: unknown, spec: FieldSpec, path: string): void {
  if (spec.type === "string") {
    if (typeof value !== "string") {
      throw new StructuredOutputRejected(`${describe(path)} is not a string`);
    }
    if (spec.minLength !== undefined && value.trim().length < spec.minLength) {
      throw new StructuredOutputRejected(`${describe(path)} is too short`);
    }
    if (spec.enum && !spec.enum.includes(value)) {
      throw new StructuredOutputRejected(
        `${describe(path)} is not one of the permitted values`,
      );
    }
    return;
  }

  if (spec.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new StructuredOutputRejected(`${describe(path)} is not a boolean`);
    }
    return;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new StructuredOutputRejected(`${describe(path)} is not a number`);
  }
  if (spec.type === "integer" && !Number.isInteger(value)) {
    throw new StructuredOutputRejected(`${describe(path)} is not an integer`);
  }
  if (spec.minimum !== undefined && value < spec.minimum) {
    throw new StructuredOutputRejected(`${describe(path)} is below its minimum`);
  }
  if (spec.maximum !== undefined && value > spec.maximum) {
    throw new StructuredOutputRejected(`${describe(path)} is above its maximum`);
  }
}

function checkValue(value: unknown, spec: FieldSpec, path: string): void {
  if (value === null || value === undefined) {
    if (spec.optional) return;
    throw new StructuredOutputRejected(`${describe(path)} is missing`);
  }

  if (spec.type === "array") {
    if (!Array.isArray(value)) {
      throw new StructuredOutputRejected(`${describe(path)} is not an array`);
    }
    if (!spec.items) return;
    value.forEach((entry, index) =>
      checkValue(entry, spec.items as FieldSpec, `${path}[${index}]`),
    );
    return;
  }

  if (spec.type === "object") {
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new StructuredOutputRejected(`${describe(path)} is not an object`);
    }
    const record = value as Record<string, unknown>;
    for (const [key, fieldSpec] of Object.entries(spec.fields ?? {})) {
      checkValue(record[key], fieldSpec, path.length === 0 ? key : `${path}.${key}`);
    }
    return;
  }

  checkPrimitive(value, spec, path);
}

export function parseStructured<T>(value: unknown, spec: FieldSpec): T {
  if (value === null || value === undefined) {
    throw new StructuredOutputRejected("no structured output was returned");
  }
  checkValue(value, spec, "");
  return value as T;
}

function toJsonSchemaNode(spec: FieldSpec): Record<string, unknown> {
  if (spec.type === "array") {
    return {
      type: "array",
      items: spec.items ? toJsonSchemaNode(spec.items) : {},
    };
  }
  if (spec.type === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, fieldSpec] of Object.entries(spec.fields ?? {})) {
      properties[key] = toJsonSchemaNode(fieldSpec);
      if (!fieldSpec.optional) required.push(key);
    }
    return { type: "object", properties, required };
  }
  const node: Record<string, unknown> = { type: spec.type };
  if (spec.enum) node.enum = spec.enum;
  if (spec.minimum !== undefined) node.minimum = spec.minimum;
  if (spec.maximum !== undefined) node.maximum = spec.maximum;
  return node;
}

export function toJsonSchema(spec: FieldSpec): Record<string, unknown> {
  return toJsonSchemaNode(spec);
}
