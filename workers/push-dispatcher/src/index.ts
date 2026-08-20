/**
 * REL-020 — push-dispatcher 실연결.
 * Phase0: Nest in-process emit → 이 Worker HTTP /dispatch → Web Push.
 * Phase0 stub 수락 경로 0. kill이면 send 0.
 * PRODUCTION_DEPLOY = 0 — 이 슬라이스는 wrangler deploy를 실행하지 않는다.
 */

import {
  handleDispatcherRequest,
} from "./lib/dispatch.cjs";

export interface Env {
  SERVICE: string;
  PHASE: string;
  PUSH_ENABLED?: string;
  PUSH_DISPATCH_TOKEN?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const result = await handleDispatcherRequest(request, env);
    return Response.json(result.body, { status: result.statusCode });
  },
};
