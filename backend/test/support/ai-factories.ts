import {
  BatchItem,
  BatchPollResult,
  ModelProvider,
  ModelProviderError,
  ModelRequest,
  ModelResponse,
} from "../../src/ai/model-provider";

export interface RecordingModelProvider extends ModelProvider {
  calls: ModelRequest[];
  batches: { reference: string; items: BatchItem[] }[];
  failNext: boolean;
  retryableFailure: boolean;
  structuredFor: (request: ModelRequest) => unknown;
  textFor: (request: ModelRequest) => string;
  usageFor: (request: ModelRequest) => ModelResponse["usage"];
  batchComplete: boolean;
  batchOutcomeFor: (reference: string) => "SUCCEEDED" | "FAILED" | "PENDING";
}

export function makeModelProvider(): RecordingModelProvider {
  const provider: RecordingModelProvider = {
    calls: [],
    batches: [],
    failNext: false,
    retryableFailure: false,
    structuredFor: () => null,
    textFor: () => "an answer",
    usageFor: () => ({
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 90,
      cacheWriteTokens: 0,
    }),
    batchComplete: true,
    batchOutcomeFor: () => "SUCCEEDED",

    async complete(request: ModelRequest): Promise<ModelResponse> {
      provider.calls.push(request);
      if (provider.failNext) {
        throw new ModelProviderError(
          "provider unavailable",
          provider.retryableFailure,
        );
      }
      return {
        text: provider.textFor(request),
        structured: provider.structuredFor(request),
        usage: provider.usageFor(request),
      };
    },

    async submitBatch(items: BatchItem[]): Promise<string> {
      if (provider.failNext) {
        throw new ModelProviderError("batch rejected", false);
      }
      const reference = `batch-${provider.batches.length + 1}`;
      provider.batches.push({ reference, items });
      for (const item of items) provider.calls.push(item.request);
      return reference;
    },

    async pollBatch(batchReference: string): Promise<BatchPollResult> {
      const batch = provider.batches.find(
        (candidate) => candidate.reference === batchReference,
      );
      if (!batch) return { complete: false, items: [] };
      if (!provider.batchComplete) return { complete: false, items: [] };

      return {
        complete: true,
        items: batch.items
          .filter(
            (item) => provider.batchOutcomeFor(item.reference) !== "PENDING",
          )
          .map((item) => {
            const outcome = provider.batchOutcomeFor(item.reference);
            if (outcome === "SUCCEEDED") {
              return {
                reference: item.reference,
                state: "SUCCEEDED" as const,
                response: {
                  text: provider.textFor(item.request),
                  structured: provider.structuredFor(item.request),
                  usage: provider.usageFor(item.request),
                },
                message: "",
              };
            }
            return {
              reference: item.reference,
              state: "FAILED" as const,
              response: null,
              message: "item failed",
            };
          }),
      };
    },
  };

  return provider;
}
