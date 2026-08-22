import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { aiBatches, aiBatchItems } from "../database/schema";
import { DEFAULT_ORGANIZATION_ID } from "../database/schema/organizations";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { AiService } from "./ai.service";
import {
  MODEL_PROVIDER,
  ModelProvider,
  ModelRequest,
} from "./model-provider";

export const BATCH_RECONCILE_JOB = "ai.batches.reconcile";
const RECONCILE_EVERY_MS = 60_000;

export interface BatchSubmission {
  feature: string;
  model: string;
  organizationId: string | null;
  requestedBy: string | null;
  items: {
    reference: string;
    request: ModelRequest;
    context: Record<string, unknown>;
  }[];
}

export interface ReconciledItem {
  reference: string;
  context: unknown;
  text: string;
  structured: unknown;
}

export type BatchReconciler = (item: ReconciledItem) => Promise<void>;
export type BatchCompletionCallback = (requestedBy: string | null) => Promise<void>;

@Injectable()
export class AiBatchService implements OnModuleInit {
  private readonly logger = new Logger(AiBatchService.name);
  private readonly reconcilers = new Map<string, BatchReconciler>();
  private readonly completionCallbacks = new Map<string, BatchCompletionCallback>();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MODEL_PROVIDER) private readonly provider: ModelProvider,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      BATCH_RECONCILE_JOB,
      () => this.reconcile(),
      RECONCILE_EVERY_MS,
      (err) => this.logger.error(`Could not schedule batch reconcile: ${String(err)}`),
    );
  }

  registerReconciler(feature: string, reconciler: BatchReconciler): void {
    this.reconcilers.set(feature, reconciler);
  }

  registerCompletionCallback(feature: string, callback: BatchCompletionCallback): void {
    this.completionCallbacks.set(feature, callback);
  }

  async submit(submission: BatchSubmission): Promise<string> {
    const now = this.clock.now();
    const [batch] = await this.db
      .insert(aiBatches)
      .values({
        organizationId: submission.organizationId ?? DEFAULT_ORGANIZATION_ID,
        feature: submission.feature,
        model: submission.model,
        requestedBy: submission.requestedBy,
        status: "SUBMITTED",
        submittedAt: now,
      })
      .returning();

    await this.db.insert(aiBatchItems).values(
      submission.items.map((item) => ({
        batchId: batch.batchId,
        reference: item.reference,
        state: "PENDING" as const,
        context: item.context,
        createdAt: now,
      })),
    );

    try {
      const providerReference = await this.provider.submitBatch(
        submission.items.map((item) => ({
          reference: item.reference,
          request: item.request,
        })),
      );
      await this.db
        .update(aiBatches)
        .set({ providerReference })
        .where(eq(aiBatches.batchId, batch.batchId));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.db
        .update(aiBatches)
        .set({ status: "FAILED", failureReason: reason.slice(0, 400), completedAt: now })
        .where(eq(aiBatches.batchId, batch.batchId));
      await this.ai.record(
        {
          feature: submission.feature,
          model: submission.model,
          organizationId: submission.organizationId,
        },
        "FAILED",
        null,
        reason.slice(0, 400),
        true,
      );
    }

    return batch.batchId;
  }

  async reconcile(): Promise<void> {
    const open = await this.db
      .select()
      .from(aiBatches)
      .where(eq(aiBatches.status, "SUBMITTED"));

    for (const batch of open) {
      if (!batch.providerReference) continue;
      try {
        await this.reconcileBatch(batch.batchId, batch.providerReference, batch.feature, batch.model, batch.organizationId, batch.requestedBy);
      } catch (error) {
        this.logger.error(
          `Could not reconcile batch ${batch.batchId}: ${String(error)}`,
        );
      }
    }
  }

  private async reconcileBatch(
    batchId: string,
    providerReference: string,
    feature: string,
    model: string,
    organizationId: string,
    requestedBy: string | null,
  ): Promise<void> {
    const poll = await this.provider.pollBatch(providerReference);
    if (!poll.complete) return;

    const reconciler = this.reconcilers.get(feature);

    for (const result of poll.items) {
      const [claimed] = await this.db
        .update(aiBatchItems)
        .set({
          state: result.state === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
          resultText: result.response?.text ?? null,
          resultStructured: result.response?.structured ?? null,
          failureReason: result.state === "SUCCEEDED" ? null : result.message,
        })
        .where(
          and(
            eq(aiBatchItems.batchId, batchId),
            eq(aiBatchItems.reference, result.reference),
            eq(aiBatchItems.state, "PENDING"),
          ),
        )
        .returning();

      if (!claimed) continue;

      await this.ai.record(
        { feature, model, organizationId },
        result.state === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
        result.response?.usage ?? null,
        result.state === "SUCCEEDED" ? null : result.message.slice(0, 400),
        true,
      );

      if (result.state !== "SUCCEEDED" || !reconciler) continue;

      try {
        await reconciler({
          reference: claimed.reference,
          context: claimed.context,
          text: result.response?.text ?? "",
          structured: result.response?.structured ?? null,
        });
        await this.db
          .update(aiBatchItems)
          .set({ state: "RECONCILED", reconciledAt: this.clock.now() })
          .where(eq(aiBatchItems.itemId, claimed.itemId));
      } catch (error) {
        this.logger.error(
          `Reconciler for ${feature} failed on ${claimed.reference}: ${String(error)}`,
        );
      }
    }

    const outstanding = await this.db
      .select({ itemId: aiBatchItems.itemId })
      .from(aiBatchItems)
      .where(
        and(
          eq(aiBatchItems.batchId, batchId),
          inArray(aiBatchItems.state, ["PENDING"]),
        ),
      );

    if (outstanding.length === 0) {
      await this.db
        .update(aiBatches)
        .set({ status: "COMPLETE", completedAt: this.clock.now() })
        .where(eq(aiBatches.batchId, batchId));

      const completionCb = this.completionCallbacks.get(feature);
      if (completionCb) {
        try {
          await completionCb(requestedBy);
        } catch (error) {
          this.logger.error(
            `Completion callback for ${feature} failed: ${String(error)}`,
          );
        }
      }
    }
  }
}
