import { Injectable } from "@nestjs/common";

export const MODEL_PROVIDER = "MODEL_PROVIDER";

export const OPUS = "claude-opus-5";
export const HAIKU = "claude-haiku-4-5";

export type JsonSchema = Record<string, unknown>;

export interface ModelRequest {
  model: string;
  feature: string;
  organizationId: string | null;
  cachedPrefix: string;
  volatileSuffix: string;
  maxTokens: number;
  responseSchema?: JsonSchema;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ModelResponse {
  text: string;
  structured: unknown;
  usage: ModelUsage;
}

export interface BatchItem {
  reference: string;
  request: ModelRequest;
}

export type BatchItemState = "PENDING" | "SUCCEEDED" | "FAILED";

export interface BatchItemResult {
  reference: string;
  state: BatchItemState;
  response: ModelResponse | null;
  message: string;
}

export interface BatchPollResult {
  complete: boolean;
  items: BatchItemResult[];
}

export interface ModelProvider {
  complete(request: ModelRequest): Promise<ModelResponse>;
  submitBatch(items: BatchItem[]): Promise<string>;
  pollBatch(batchReference: string): Promise<BatchPollResult>;
}

export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ModelProviderError";
  }
}

const API_BASE = "https://api.anthropic.com/v1";
const API_VERSION = "2023-06-01";

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  input?: unknown;
}

interface AnthropicMessage {
  content?: AnthropicContentBlock[];
  usage?: AnthropicUsage;
}

function readUsage(usage: AnthropicUsage | undefined): ModelUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
  };
}

function readResponse(message: AnthropicMessage): ModelResponse {
  const blocks = message.content ?? [];
  const text = blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  const toolBlock = blocks.find((block) => block.type === "tool_use");
  return {
    text,
    structured: toolBlock ? (toolBlock.input ?? null) : null,
    usage: readUsage(message.usage),
  };
}

export function buildMessageBody(request: ModelRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: request.maxTokens,
    system: [
      {
        type: "text",
        text: request.cachedPrefix,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: request.volatileSuffix }],
  };

  if (request.responseSchema) {
    body.tools = [
      {
        name: "respond",
        description: "Return the response in the required shape",
        input_schema: request.responseSchema,
      },
    ];
    body.tool_choice = { type: "tool", name: "respond" };
  }

  return body;
}

@Injectable()
export class HttpModelProvider implements ModelProvider {
  private headers(): Record<string, string> {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      throw new ModelProviderError("ANTHROPIC_API_KEY is not configured", false);
    }
    return {
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
      "content-type": "application/json",
    };
  }

  private async send(path: string, method: string, body?: unknown) {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new ModelProviderError(
        `Model request failed (${response.status}): ${detail.slice(0, 200)}`,
        response.status === 429 || response.status >= 500,
      );
    }
    return response.json() as Promise<Record<string, unknown>>;
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const payload = await this.send(
      "/messages",
      "POST",
      buildMessageBody(request),
    );
    return readResponse(payload as AnthropicMessage);
  }

  async submitBatch(items: BatchItem[]): Promise<string> {
    const payload = await this.send("/messages/batches", "POST", {
      requests: items.map((item) => ({
        custom_id: item.reference,
        params: buildMessageBody(item.request),
      })),
    });
    const id = payload.id;
    if (typeof id !== "string") {
      throw new ModelProviderError("Batch submission returned no id", false);
    }
    return id;
  }

  async pollBatch(batchReference: string): Promise<BatchPollResult> {
    const status = await this.send(
      `/messages/batches/${batchReference}`,
      "GET",
    );
    if (status.processing_status !== "ended") {
      return { complete: false, items: [] };
    }

    const resultsUrl = status.results_url;
    if (typeof resultsUrl !== "string") {
      throw new ModelProviderError("Completed batch exposed no results", false);
    }

    const response = await fetch(resultsUrl, { headers: this.headers() });
    if (!response.ok) {
      throw new ModelProviderError(
        `Batch results unavailable (${response.status})`,
        response.status >= 500,
      );
    }

    const body = await response.text();
    const items: BatchItemResult[] = [];
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      const parsed = JSON.parse(trimmed) as {
        custom_id?: string;
        result?: { type?: string; message?: AnthropicMessage; error?: unknown };
      };
      const reference = parsed.custom_id ?? "";
      const outcome = parsed.result;
      if (outcome?.type === "succeeded" && outcome.message) {
        items.push({
          reference,
          state: "SUCCEEDED",
          response: readResponse(outcome.message),
          message: "",
        });
      } else {
        items.push({
          reference,
          state: "FAILED",
          response: null,
          message: JSON.stringify(outcome?.error ?? "unknown").slice(0, 400),
        });
      }
    }

    return { complete: true, items };
  }
}
