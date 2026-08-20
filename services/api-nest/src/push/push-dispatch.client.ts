/**
 * Nest → push-dispatcher.
 * URL이 있으면 HTTP, 없으면 동일 CJS 코어 in-process (Phase0).
 */

import { Injectable } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";

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
  handleDispatcherRequest: (
    request: {
      method: string;
      url: string;
      headers: { authorization?: string };
      body: Record<string, unknown>;
    },
    env: Record<string, string | undefined>,
    hooks?: { sendWebPush?: (input: unknown) => { ok: boolean } },
  ) => Promise<{ statusCode: number; body: Record<string, unknown> }>;
};

export type DispatchClientResult = {
  status: string;
  sent: number;
  sendAttempted: boolean;
};

@Injectable()
export class PushDispatchClient {
  async dispatch(input: {
    pushEnabled: boolean;
    subscription: {
      endpoint: string;
      p256dh: string;
      auth: string;
    };
    payload: Record<string, unknown>;
    dryRun?: boolean;
  }): Promise<DispatchClientResult> {
    const url = (process.env.PUSH_DISPATCHER_URL || "").replace(/\/$/, "");
    const token = process.env.PUSH_DISPATCH_TOKEN || "";
    const body = {
      pushEnabled: input.pushEnabled,
      subscription: input.subscription,
      payload: input.payload,
      dryRun: input.dryRun === true,
    };

    if (url && token) {
      const res = await fetch(`${url}/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as DispatchClientResult;
      return {
        status: String(json.status || "send_failed"),
        sent: Number(json.sent || 0),
        sendAttempted: json.sendAttempted === true,
      };
    }

    const local = await dispatchCore.handleDispatcherRequest(
      {
        method: "POST",
        url: "http://push-dispatcher.local/dispatch",
        headers: { authorization: `Bearer ${token || "in-process"}` },
        body,
      },
      {
        SERVICE: "push-dispatcher",
        PHASE: "0",
        PUSH_ENABLED: process.env.PUSH_ENABLED,
        PUSH_DISPATCH_TOKEN: token || "in-process",
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
        VAPID_SUBJECT: process.env.VAPID_SUBJECT,
      },
    );
    const result = local.body as DispatchClientResult;
    return {
      status: String(result.status || "send_failed"),
      sent: Number(result.sent || 0),
      sendAttempted: result.sendAttempted === true,
    };
  }
}
