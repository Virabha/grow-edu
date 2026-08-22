import { Injectable } from "@nestjs/common";

export const PROJECT_CHECK_RUNNER = "PROJECT_CHECK_RUNNER";

export type CheckStatus = "PASSED" | "FAILED" | "HARNESS_ERROR";

export interface CheckRunResult {
  buildStatus: CheckStatus;
  lintStatus: CheckStatus;
  testStatus: CheckStatus;
  detail: Record<string, unknown>;
}

export interface ProjectCheckRunner {
  runChecks(repositoryUrl: string, timeoutSeconds: number): Promise<CheckRunResult>;
}

@Injectable()
export class HttpProjectCheckRunner implements ProjectCheckRunner {
  async runChecks(repositoryUrl: string, timeoutSeconds: number): Promise<CheckRunResult> {
    const baseUrl = process.env.PROJECT_CHECK_URL ?? "";
    if (!baseUrl) throw new Error("PROJECT_CHECK_URL is not configured");
    const response = await fetch(`${baseUrl}/checks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PROJECT_CHECK_TOKEN ?? ""}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
      body: JSON.stringify({ repositoryUrl }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Check harness failed (${response.status}): ${body.slice(0, 200)}`);
    }
    return response.json() as Promise<CheckRunResult>;
  }
}
