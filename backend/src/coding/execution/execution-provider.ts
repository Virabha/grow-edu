import { Injectable } from "@nestjs/common";

export const EXECUTION_PROVIDER = "EXECUTION_PROVIDER";

export interface ExecutionCase {
  ordinal: number;
  input: string;
  expectedOutput: string;
}

export interface ExecutionRequest {
  language: string;
  sourceCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  cases: ExecutionCase[];
}

export type ProviderOutcome =
  | "OK"
  | "WRONG_OUTPUT"
  | "TIMEOUT"
  | "OUT_OF_MEMORY"
  | "RUNTIME_FAULT"
  | "COMPILE_FAILURE";

export interface ExecutionCaseOutcome {
  ordinal: number;
  outcome: ProviderOutcome;
  actualOutput: string;
  runtimeMs: number;
  memoryKb: number;
  message: string;
}

export interface ExecutionResult {
  reference: string;
  cases: ExecutionCaseOutcome[];
}

export interface ExecutionProvider {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

@Injectable()
export class HttpExecutionProvider implements ExecutionProvider {
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const baseUrl = process.env.CODE_EXECUTION_URL ?? "";
    if (!baseUrl) {
      throw new Error("CODE_EXECUTION_URL is not configured");
    }
    const response = await fetch(`${baseUrl}/executions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CODE_EXECUTION_TOKEN ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Code execution failed (${response.status}): ${body.slice(0, 200)}`,
      );
    }
    return response.json() as Promise<ExecutionResult>;
  }
}
