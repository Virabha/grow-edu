import { Inject, Injectable, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { aiModelCalls } from "../database/schema";
import { DEFAULT_ORGANIZATION_ID } from "../database/schema/organizations";
import {
  MODEL_PROVIDER,
  ModelProvider,
  ModelProviderError,
  ModelRequest,
  ModelResponse,
} from "./model-provider";
import { assemblePrompt, findVolatileMarkers, GroundingSource } from "./prompt";
import { FieldSpec, parseStructured, StructuredOutputRejected, toJsonSchema } from "./structured";

export interface CompletionOptions {
  feature: string;
  model: string;
  organizationId: string | null;
  instructions: string;
  sources: GroundingSource[];
  question: string;
  maxTokens: number;
}

export type CompletionOutcome<T> =
  | { ok: true; value: T; usage: ModelResponse["usage"] }
  | { ok: false; reason: string; retryable: boolean };

const MAX_SHAPE_ATTEMPTS = 2;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MODEL_PROVIDER) private readonly provider: ModelProvider,
  ) {}

  buildRequest(options: CompletionOptions, spec?: FieldSpec): ModelRequest {
    const prompt = assemblePrompt(
      options.instructions,
      options.sources,
      options.question,
    );

    const markers = findVolatileMarkers(prompt.cachedPrefix);
    if (markers.length > 0) {
      this.logger.error(
        `Cache prefix for "${options.feature}" contains ${markers.join(", ")}; caching will not hit`,
      );
    }

    return {
      model: options.model,
      feature: options.feature,
      organizationId: options.organizationId,
      cachedPrefix: prompt.cachedPrefix,
      volatileSuffix: prompt.volatileSuffix,
      maxTokens: options.maxTokens,
      responseSchema: spec ? toJsonSchema(spec) : undefined,
    };
  }

  async record(
    request: Pick<ModelRequest, "feature" | "model" | "organizationId">,
    outcome: "SUCCEEDED" | "FAILED" | "REJECTED",
    usage: ModelResponse["usage"] | null,
    failureReason: string | null,
    batched = false,
  ): Promise<void> {
    await this.db.insert(aiModelCalls).values({
      organizationId: request.organizationId ?? DEFAULT_ORGANIZATION_ID,
      feature: request.feature,
      model: request.model,
      outcome,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      cacheReadTokens: usage?.cacheReadTokens ?? 0,
      cacheWriteTokens: usage?.cacheWriteTokens ?? 0,
      batched: batched ? "YES" : "NO",
      failureReason,
      createdAt: this.clock.now(),
    });
  }

  async completeText(options: CompletionOptions): Promise<CompletionOutcome<string>> {
    const request = this.buildRequest(options);
    try {
      const response = await this.provider.complete(request);
      await this.record(request, "SUCCEEDED", response.usage, null);
      return { ok: true, value: response.text, usage: response.usage };
    } catch (error) {
      const retryable =
        error instanceof ModelProviderError ? error.retryable : false;
      const reason = error instanceof Error ? error.message : String(error);
      await this.record(request, "FAILED", null, reason.slice(0, 400));
      return { ok: false, reason, retryable };
    }
  }

  async completeStructured<T>(
    options: CompletionOptions,
    spec: FieldSpec,
  ): Promise<CompletionOutcome<T>> {
    const request = this.buildRequest(options, spec);
    let lastReason = "structured output was never produced";

    for (let attempt = 1; attempt <= MAX_SHAPE_ATTEMPTS; attempt += 1) {
      let response: ModelResponse;
      try {
        response = await this.provider.complete(request);
      } catch (error) {
        const retryable =
          error instanceof ModelProviderError ? error.retryable : false;
        const reason = error instanceof Error ? error.message : String(error);
        await this.record(request, "FAILED", null, reason.slice(0, 400));
        return { ok: false, reason, retryable };
      }

      try {
        const value = parseStructured<T>(response.structured, spec);
        await this.record(request, "SUCCEEDED", response.usage, null);
        return { ok: true, value, usage: response.usage };
      } catch (error) {
        lastReason =
          error instanceof StructuredOutputRejected
            ? error.reason
            : String(error);
        await this.record(
          request,
          "REJECTED",
          response.usage,
          lastReason.slice(0, 400),
        );
      }
    }

    return { ok: false, reason: lastReason, retryable: false };
  }
}
