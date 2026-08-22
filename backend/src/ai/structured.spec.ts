import {
  FieldSpec,
  parseStructured,
  StructuredOutputRejected,
  toJsonSchema,
} from "./structured";

const CHAPTERS: FieldSpec = {
  type: "object",
  fields: {
    summary: { type: "string", minLength: 5 },
    chapters: {
      type: "array",
      items: {
        type: "object",
        fields: {
          title: { type: "string", minLength: 1 },
          startSeconds: { type: "integer", minimum: 0 },
        },
      },
    },
  },
};

describe("structured output", () => {
  it("accepts output matching the declared shape", () => {
    const value = parseStructured<{ summary: string }>(
      {
        summary: "a summary",
        chapters: [{ title: "Intro", startSeconds: 0 }],
      },
      CHAPTERS,
    );

    expect(value.summary).toBe("a summary");
  });

  it("rejects a missing required field rather than coercing it", () => {
    expect(() =>
      parseStructured({ chapters: [] }, CHAPTERS),
    ).toThrow(StructuredOutputRejected);
  });

  it("rejects a wrong primitive type", () => {
    expect(() =>
      parseStructured(
        { summary: "a summary", chapters: [{ title: "Intro", startSeconds: "0" }] },
        CHAPTERS,
      ),
    ).toThrow(StructuredOutputRejected);
  });

  it("rejects a non-integer where an integer is declared", () => {
    expect(() =>
      parseStructured(
        { summary: "a summary", chapters: [{ title: "Intro", startSeconds: 1.5 }] },
        CHAPTERS,
      ),
    ).toThrow(StructuredOutputRejected);
  });

  it("rejects a value below its declared minimum", () => {
    expect(() =>
      parseStructured(
        { summary: "a summary", chapters: [{ title: "Intro", startSeconds: -1 }] },
        CHAPTERS,
      ),
    ).toThrow(StructuredOutputRejected);
  });

  it("rejects null output entirely", () => {
    expect(() => parseStructured(null, CHAPTERS)).toThrow(
      StructuredOutputRejected,
    );
  });

  it("rejects an array where an object is declared", () => {
    expect(() => parseStructured([], CHAPTERS)).toThrow(
      StructuredOutputRejected,
    );
  });

  it("rejects a value outside a declared enum", () => {
    const spec: FieldSpec = {
      type: "object",
      fields: { verdict: { type: "string", enum: ["PASS", "FAIL"] } },
    };

    expect(() => parseStructured({ verdict: "MAYBE" }, spec)).toThrow(
      StructuredOutputRejected,
    );
  });

  it("allows a declared optional field to be absent", () => {
    const spec: FieldSpec = {
      type: "object",
      fields: {
        required: { type: "string" },
        note: { type: "string", optional: true },
      },
    };

    expect(() => parseStructured({ required: "x" }, spec)).not.toThrow();
  });

  it("names the offending field so a rejection is diagnosable", () => {
    try {
      parseStructured({ summary: "ok enough", chapters: [{ title: "x" }] }, CHAPTERS);
      throw new Error("should have been rejected");
    } catch (error) {
      expect((error as StructuredOutputRejected).reason).toContain(
        "chapters[0].startSeconds",
      );
    }
  });

  it("emits a json schema marking optional fields as not required", () => {
    const schema = toJsonSchema({
      type: "object",
      fields: {
        required: { type: "string" },
        note: { type: "string", optional: true },
      },
    });

    expect(schema.required).toEqual(["required"]);
  });
});
