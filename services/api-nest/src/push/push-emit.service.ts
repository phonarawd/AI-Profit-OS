/**
 * REL-020 발송 진입점. kill 없이 enqueue 금지.
 * REL-021 채널 필터. pref=false면 enqueue 0. 채널 없으면 전채널 강제 발송 금지.
 */

import { Injectable } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { NotificationPrefsService } from "../inbox/notification-prefs.service";
import type { NotifyPushChannel } from "../inbox/notification-prefs.defaults";
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
    channelAllowed: boolean;
    channel: string;
  }) => { status: string; sent: number; enqueue: boolean };
};

@Injectable()
export class PushEmitService {
  constructor(
    private readonly kill: PushKillService,
    private readonly subs: PushSubscriptionService,
    private readonly client: PushDispatchClient,
    private readonly prefs: NotificationPrefsService,
  ) {}

  async emitToUser(input: {
    userId: string;
    channel: NotifyPushChannel;
    payload: Record<string, unknown>;
    dryRun?: boolean;
  }): Promise<{ status: string; sent: number; sendAttempted: boolean }> {
    const channel = input.channel;
    if (!channel) {
      return { status: "filtered", sent: 0, sendAttempted: false };
    }

    const channelAllowed = await this.safeAllow(input.userId, channel);
    const pushEnabled = await this.kill.getEnabled();
    const list = await this.safeList(input.userId);
    const plan = dispatchCore.planEmit({
      pushEnabled,
      subscriptionCount: list.length,
      channelAllowed,
      channel,
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
        channelAllowed: true,
        channel,
        subscription: {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        payload: { ...input.payload, channel },
        dryRun: input.dryRun === true,
      });
      lastStatus = result.status;
      sent += result.sent;
      sendAttempted = sendAttempted || result.sendAttempted;
    }
    return { status: lastStatus, sent, sendAttempted };
  }

  private async safeAllow(userId: string, channel: NotifyPushChannel) {
    try {
      return await this.prefs.allowPush(userId, channel);
    } catch {
      return false;
    }
  }

  private async safeList(userId: string) {
    try {
      return await this.subs.listForUser(userId);
    } catch {
      return [];
    }
  }
}
