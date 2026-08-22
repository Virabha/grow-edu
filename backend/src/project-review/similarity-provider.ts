import { Injectable } from "@nestjs/common";

export const PROJECT_SIMILARITY_PROVIDER = "PROJECT_SIMILARITY_PROVIDER";

export interface CohortEntry {
  submissionId: string;
  repositoryUrl: string;
}

export interface MatchedRegion {
  path: string;
  startLine: number;
  endLine: number;
}

export interface CohortSimilarityMatch {
  comparedSubmissionId: string;
  score: number;
  matchedRegions: MatchedRegion[];
}

export interface PublicSimilarityMatch {
  sourceLabel: string;
  score: number;
  matchedRegions: MatchedRegion[];
}

export interface SimilarityCheckResult {
  cohortMatches: CohortSimilarityMatch[];
  publicMatches: PublicSimilarityMatch[];
}

export interface ProjectSimilarityProvider {
  compare(
    repositoryUrl: string,
    cohortEntries: CohortEntry[],
  ): Promise<SimilarityCheckResult>;
}

@Injectable()
export class HttpProjectSimilarityProvider implements ProjectSimilarityProvider {
  async compare(
    repositoryUrl: string,
    cohortEntries: CohortEntry[],
  ): Promise<SimilarityCheckResult> {
    const baseUrl = process.env.PROJECT_SIMILARITY_URL ?? "";
    if (!baseUrl) throw new Error("PROJECT_SIMILARITY_URL is not configured");
    const response = await fetch(`${baseUrl}/similarity`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PROJECT_SIMILARITY_TOKEN ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repositoryUrl, cohortEntries }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Similarity service failed (${response.status}): ${body.slice(0, 200)}`);
    }
    return response.json() as Promise<SimilarityCheckResult>;
  }
}
