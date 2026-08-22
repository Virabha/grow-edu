import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE_ROOT = join(__dirname, "..");

const MODEL_TOUCHING = [
  "MODEL_PROVIDER",
  "AiService",
  "AiBatchService",
  "completeStructured",
  "completeText",
];

const FORBIDDEN = [
  {
    label: "writes an awarded-marks column",
    pattern: /awardedMarks\s*:/,
  },
  {
    label: "writes a committed assessment criterion score",
    pattern: /\.(insert|update)\(\s*assessmentCriterionScores/,
  },
  {
    label: "writes a committed project criterion score",
    pattern: /\.(insert|update)\(\s*projectCriterionScores/,
  },
  {
    label: "sets a project milestone to passed",
    pattern: /(state|outcome)\s*:\s*"PASSED"/,
  },
  {
    label: "issues a batch certificate",
    pattern: /\.insert\(\s*batchCertificates/,
  },
  {
    label: "issues a path certificate",
    pattern: /\.insert\(\s*pathCertificates/,
  },
];

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      found.push(...sourceFiles(full));
      continue;
    }
    if (!entry.endsWith(".ts")) continue;
    if (entry.endsWith(".spec.ts")) continue;
    found.push(full);
  }
  return found;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("the marking boundary", () => {
  const files = sourceFiles(SOURCE_ROOT).map((path) => ({
    path: path.slice(SOURCE_ROOT.length + 1).replace(/\\/g, "/"),
    source: stripComments(readFileSync(path, "utf8")),
  }));

  const modelTouching = files.filter((file) =>
    MODEL_TOUCHING.some((marker) => file.source.includes(marker)),
  );

  it("finds the model-touching modules it is meant to police", () => {
    expect(modelTouching.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)(
    "has no model-touching module that $label",
    ({ pattern }) => {
      const offenders = modelTouching
        .filter((file) => pattern.test(file.source))
        .map((file) => file.path);

      expect(offenders).toEqual([]);
    },
  );

  it("keeps the model provider itself free of any persistence of outcomes", () => {
    const provider = files.find(
      (file) => file.path === "ai/model-provider.ts",
    );
    expect(provider).toBeDefined();
    expect(provider?.source).not.toContain(".insert(");
    expect(provider?.source).not.toContain(".update(");
  });
});
