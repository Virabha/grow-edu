export interface GroundingSource {
  sourceId: string;
  kind: string;
  title: string;
  body: string;
}

export interface AssembledPrompt {
  cachedPrefix: string;
  volatileSuffix: string;
}

const SOURCE_SEPARATOR = "\n\n---\n\n";

export function orderSources(sources: GroundingSource[]): GroundingSource[] {
  return [...sources].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind < right.kind ? -1 : 1;
    if (left.sourceId !== right.sourceId) {
      return left.sourceId < right.sourceId ? -1 : 1;
    }
    return 0;
  });
}

export function renderSources(sources: GroundingSource[]): string {
  return orderSources(sources)
    .map(
      (source) =>
        `[${source.kind}:${source.sourceId}] ${source.title}\n${source.body}`,
    )
    .join(SOURCE_SEPARATOR);
}

export function assemblePrompt(
  instructions: string,
  sources: GroundingSource[],
  volatile: string,
): AssembledPrompt {
  return {
    cachedPrefix: `${instructions}${SOURCE_SEPARATOR}${renderSources(sources)}`,
    volatileSuffix: volatile,
  };
}

const VOLATILE_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "an ISO timestamp", pattern: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/ },
  { name: "an epoch millisecond value", pattern: /\b1[6-9]\d{11}\b/ },
];

export function findVolatileMarkers(cachedPrefix: string): string[] {
  const found: string[] = [];
  for (const candidate of VOLATILE_PATTERNS) {
    if (candidate.pattern.test(cachedPrefix)) found.push(candidate.name);
  }
  return found;
}
