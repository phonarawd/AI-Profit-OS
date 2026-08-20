/**
 * REL-020 발송 진입점. kill 없이 enqueue 금지.
 * 채널 필터는 REL-021.
 */

import { Injectable } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PushDispatchClient } from "./push-dispatch.client";
import { PushKillService } from "./push-kill.service";
import { PushSubscriptionService } from "./push-subscription.service";

const requireCjs = createRequire(__filename);
const dispatchCore = requireCjs(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "workers",
    "push-dispatcher",
    "src",
    "lib",
    "dispatch.cjs",
  ),
) as {
  planEmit: (input: {
    pushEnabled: boolean;
    subscriptionCount: number;
  }) => { status: string; sent: number; enqueue: boolean };
};

@Injectable()
export class PushEmitService {
  constructor(
    private readonly kill: PushKillService,
    private readonly subs: PushSubscriptionService,
    private readonly client: PushDispatchClient,
  ) {}

  async emitToUser(input: {
    userId: string;
    payload: Record<string, unknown>;
    dryRun?: boolean;
  }): Promise<{ status: string; sent: number; sendAttempted: boolean }> {
    const pushEnabled = await this.kill.getEnabled();
    const list = await this.safeList(input.userId);
    const plan = dispatchCore.planEmit({
      pushEnabled,
      subscriptionCount: list.length,
    });
    if (!plan.enqueue) {
      return { status: plan.status, sent: 0, sendAttempted: false };
    }

    let sent = 0;
    let sendAttempted = false;
    let lastStatus = "enqueue";
    for (const sub of list) {
      const result = await this.client.dispatch({
        pushEnabled: true,
        subscription: {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        payload: input.payload,
        dryRun: input.dryRun === true,
      });
      lastStatus = result.status;
      sent += result.sent;
      sendAttempted = sendAttempted || result.sendAttempted;
    }
    return { status: lastStatus, sent, sendAttempted };
  }

  private async safeList(userId: string) {
    try {
      return await this.subs.listForUser(userId);
    } catch {
      return [];
    }
  }
}
