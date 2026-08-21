import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AppConfigService } from "../config";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { pushSubscriptions } from "../database/schema";
import { SubscribeToPushDto } from "./dto/subscribe-to-push.dto";
import { encryptPayload, vapidAuthorization } from "./web-push";

export const PUSH_SENDER = "PUSH_SENDER";

export interface PushDelivery {
  endpoint: string;
  body: Buffer;
  headers: Record<string, string>;
}

export interface PushSender {
  send(delivery: PushDelivery): Promise<{ status: number }>;
}

const GONE_STATUSES = new Set([404, 410]);
const JWT_TTL_SECONDS = 12 * 60 * 60;

@Injectable()
export class HttpPushSender implements PushSender {
  async send(delivery: PushDelivery): Promise<{ status: number }> {
    const response = await fetch(delivery.endpoint, {
      method: "POST",
      headers: delivery.headers,
      body: new Uint8Array(delivery.body),
    });
    return { status: response.status };
  }
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
    private readonly config: AppConfigService,
  ) {}

  publicKey(): string | null {
    return this.config.vapidPublicKey ?? null;
  }

  async subscribe(
    userId: string,
    dto: SubscribeToPushDto,
    userAgent: string | null,
  ) {
    const now = this.clock.now();
    const [saved] = await this.db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          userAgent,
          failureCount: 0,
        },
      })
      .returning();

    return {
      subscriptionId: saved.subscriptionId,
      endpoint: saved.endpoint,
      subscribed: true,
    };
  }

  async unsubscribe(userId: string, endpoint: string) {
    const removed = await this.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      )
      .returning({ subscriptionId: pushSubscriptions.subscriptionId });

    return { subscribed: false, removed: removed.length };
  }

  async listFor(userId: string) {
    const rows = await this.db
      .select({
        subscriptionId: pushSubscriptions.subscriptionId,
        endpoint: pushSubscriptions.endpoint,
        userAgent: pushSubscriptions.userAgent,
        createdAt: pushSubscriptions.createdAt,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async deliver(
    userId: string,
    message: { title: string; body: string; link?: string | null },
  ): Promise<{ sent: number; removed: number }> {
    const subscriptions = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subscriptions.length === 0) return { sent: 0, removed: 0 };

    const payload = JSON.stringify(message);
    const expired: string[] = [];
    let sent = 0;

    for (const subscription of subscriptions) {
      try {
        const { status } = await this.sender.send(
          this.deliveryFor(subscription, payload),
        );

        if (GONE_STATUSES.has(status)) {
          expired.push(subscription.subscriptionId);
          continue;
        }
        if (status >= 400) {
          await this.noteFailure(subscription.subscriptionId);
          continue;
        }

        sent += 1;
        await this.db
          .update(pushSubscriptions)
          .set({ lastUsedAt: this.clock.now(), failureCount: 0 })
          .where(
            eq(
              pushSubscriptions.subscriptionId,
              subscription.subscriptionId,
            ),
          );
      } catch (err) {
        this.logger.warn(
          `Push to ${subscription.endpoint} failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        await this.noteFailure(subscription.subscriptionId);
      }
    }

    if (expired.length > 0) {
      await this.db
        .delete(pushSubscriptions)
        .where(inArray(pushSubscriptions.subscriptionId, expired));
    }

    return { sent, removed: expired.length };
  }

  private deliveryFor(
    subscription: typeof pushSubscriptions.$inferSelect,
    payload: string,
  ): PushDelivery {
    const body = encryptPayload(payload, {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });

    const headers: Record<string, string> = {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    };

    const publicKey = this.config.vapidPublicKey;
    const privateKey = this.config.vapidPrivateKey;
    const subject = this.config.vapidSubject;

    if (publicKey && privateKey && subject) {
      headers.Authorization = vapidAuthorization(
        subscription.endpoint,
        subject,
        publicKey,
        privateKey,
        Math.floor(this.clock.epochMillis() / 1000) + JWT_TTL_SECONDS,
      );
    }

    return { endpoint: subscription.endpoint, body, headers };
  }

  private async noteFailure(subscriptionId: string): Promise<void> {
    const [current] = await this.db
      .select({ failureCount: pushSubscriptions.failureCount })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.subscriptionId, subscriptionId))
      .limit(1);

    await this.db
      .update(pushSubscriptions)
      .set({ failureCount: (current?.failureCount ?? 0) + 1 })
      .where(eq(pushSubscriptions.subscriptionId, subscriptionId));
  }
}
