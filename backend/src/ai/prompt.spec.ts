import {
  assemblePrompt,
  findVolatileMarkers,
  GroundingSource,
  orderSources,
} from "./prompt";

const INSTRUCTIONS = "Answer from the material below.";

function source(
  sourceId: string,
  kind = "lesson",
  body = "content",
): GroundingSource {
  return { sourceId, kind, title: `title ${sourceId}`, body };
}

describe("prompt assembly", () => {
  it("produces a byte-identical prefix for two different questions", () => {
    const sources = [source("b"), source("a")];

    const first = assemblePrompt(INSTRUCTIONS, sources, "What is inertia?");
    const second = assemblePrompt(INSTRUCTIONS, sources, "Why does it stop?");

    expect(first.cachedPrefix).toBe(second.cachedPrefix);
    expect(first.volatileSuffix).not.toBe(second.volatileSuffix);
  });

  it("orders sources deterministically regardless of retrieval order", () => {
    const forwards = [source("a"), source("b"), source("c")];
    const backwards = [source("c"), source("b"), source("a")];

    expect(assemblePrompt(INSTRUCTIONS, forwards, "q").cachedPrefix).toBe(
      assemblePrompt(INSTRUCTIONS, backwards, "q").cachedPrefix,
    );
  });

  it("orders by kind before identifier", () => {
    const ordered = orderSources([
      source("z", "lesson"),
      source("a", "transcript"),
      source("b", "lesson"),
    ]);

    expect(ordered.map((entry) => `${entry.kind}:${entry.sourceId}`)).toEqual([
      "lesson:b",
      "lesson:z",
      "transcript:a",
    ]);
  });

  it("puts the question after the cache boundary, never inside it", () => {
    const question = "What is inertia?";
    const assembled = assemblePrompt(INSTRUCTIONS, [source("a")], question);

    expect(assembled.cachedPrefix).not.toContain(question);
    expect(assembled.volatileSuffix).toBe(question);
  });

  it("flags a timestamp that has leaked into the cached prefix", () => {
    const leaked = assemblePrompt(
      INSTRUCTIONS,
      [source("a", "lesson", "generated at 2026-08-22T09:15:00Z")],
      "q",
    );

    expect(findVolatileMarkers(leaked.cachedPrefix)).toContain(
      "an ISO timestamp",
    );
  });

  it("does not flag lesson identifiers, which are stable per batch", () => {
    const assembled = assemblePrompt(
      INSTRUCTIONS,
      [source("3f2a9c14-0b7e-4d51-9a3c-77e21b8d4e60")],
      "q",
    );

    expect(findVolatileMarkers(assembled.cachedPrefix)).toEqual([]);
  });

  it("changes the prefix when the material changes", () => {
    const before = assemblePrompt(INSTRUCTIONS, [source("a")], "q");
    const after = assemblePrompt(
      INSTRUCTIONS,
      [source("a", "lesson", "different content")],
      "q",
    );

    expect(before.cachedPrefix).not.toBe(after.cachedPrefix);
  });
});
