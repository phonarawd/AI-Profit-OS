/**
 * Cloudflare Turnstile 서버 검증.
 * 비밀키가 없다고 통과시키지 않는다.
 * 성공 응답이라도 hostname / action / 시각 / 재사용을 다시 본다.
 */

import { createRequire } from "node:module";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";

export const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5000;

export type TurnstileAction =
  | "signup"
  | "login"
  | "find-id"
  | "password-reset"
  | "email-resend"
  | "magic-link"
  | "admin-login";

export type TurnstileVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "NOT_CONFIGURED"
        | "TOKEN_MISSING"
        | "VERIFY_FAILED"
        | "VERIFY_UNAVAILABLE"
        | "HOSTNAME_MISMATCH"
        | "ACTION_MISMATCH"
        | "CHALLENGE_EXPIRED"
        | "TOKEN_REPLAY";
      errorCodes?: string[];
    };

export type SiteverifyResponse = {
  success?: unknown;
  "error-codes"?: unknown;
  hostname?: unknown;
  action?: unknown;
  challenge_ts?: unknown;
};

export type TurnstileHttp = {
  siteverify(body: URLSearchParams, signal: AbortSignal): Promise<{
    ok: boolean;
    status: number;
    json: SiteverifyResponse;
  }>;
};

export type TurnstileReplayStore = {
  consume(tokenHash: string, ttlMs: number): Promise<boolean>;
};

const req = createRequire(__filename);
const policy = req(join(__dirname, "..", "..", "turnstile.policy.cjs")) as {
  REPLAY_TTL_MS: number;
  TURNSTILE_PRODUCTION_HOSTS: readonly string[];
  TURNSTILE_DEV_HOSTS: readonly string[];
  hashTurnstileToken: (token: string) => string;
  allowedTurnstileHostnames: (nodeEnv: string) => ReadonlySet<string>;
  hostnameAllowed: (hostname: string, nodeEnv: string) => boolean;
  challengeFresh: (
    challengeTs: string,
    nowMs: number,
    maxAgeMs?: number,
  ) => boolean;
  memoryReplayStore: () => TurnstileReplayStore;
  resetTurnstileReplayForTests: () => void;
  evaluateSiteverify: (
    json: SiteverifyResponse,
    opts: { nodeEnv: string; expectedAction?: string; nowMs: number },
  ) => TurnstileVerifyResult;
};

export const TURNSTILE_PRODUCTION_HOSTS = policy.TURNSTILE_PRODUCTION_HOSTS;
export const TURNSTILE_DEV_HOSTS = policy.TURNSTILE_DEV_HOSTS;
export const hashTurnstileToken = policy.hashTurnstileToken;
export const allowedTurnstileHostnames = policy.allowedTurnstileHostnames;
export const hostnameAllowed = policy.hostnameAllowed;
export const challengeFresh = policy.challengeFresh;
export const memoryReplayStore = policy.memoryReplayStore;
export const resetTurnstileReplayForTests = policy.resetTurnstileReplayForTests;

export function defaultTurnstileHttp(): TurnstileHttp {
  return {
    async siteverify(body, signal) {
      const res = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal,
      });
      const json = (await res.json()) as SiteverifyResponse;
      return { ok: res.ok, status: res.status, json };
    },
  };
}

let redisReplay: TurnstileReplayStore | null = null;

function redisReplayStore(url: string): TurnstileReplayStore {
  if (redisReplay) return redisReplay;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Redis = require("ioredis");
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 3000,
  });
  redisReplay = {
    async consume(tokenHash: string, ttlMs: number) {
      if (client.status === "wait" || client.status === "end") {
        await client.connect();
      }
      const key = "aipo:turnstile-replay:" + tokenHash;
      const set = await client.set(key, "1", "PX", ttlMs, "NX");
      return set === "OK";
    },
  };
  return redisReplay;
}

@Injectable()
export class TurnstileService {
  private readonly log = new Logger(TurnstileService.name);
  private http: TurnstileHttp = defaultTurnstileHttp();
  private nowMs: () => number = Date.now;
  private replay: TurnstileReplayStore = memoryReplayStore();
  private replayOverride = false;

  /** 테스트 전용 — Nest 생성자에 넣지 않는다. */
  useTestHarness(h: {
    http?: TurnstileHttp;
    nowMs?: () => number;
    replay?: TurnstileReplayStore;
  }): void {
    if (h.http) this.http = h.http;
    if (h.nowMs) this.nowMs = h.nowMs;
    if (h.replay) {
      this.replay = h.replay;
      this.replayOverride = true;
    }
  }

  private replayStore(redisUrl: string | null): TurnstileReplayStore {
    if (this.replayOverride) return this.replay;
    if (redisUrl) return redisReplayStore(redisUrl);
    return this.replay;
  }

  configured(): boolean {
    return Boolean(loadPhase0Env().turnstileSecretKey);
  }

  async verify(
    token: unknown,
    opts: { remoteIp?: string; expectedAction?: TurnstileAction } = {},
  ): Promise<TurnstileVerifyResult> {
    const env = loadPhase0Env();
    const secret = env.turnstileSecretKey;
    if (!secret) {
      return { ok: false, reason: "NOT_CONFIGURED" };
    }
    const tokenStr = typeof token === "string" ? token.trim() : "";
    if (!tokenStr || tokenStr.length > 2048) {
      return { ok: false, reason: "TOKEN_MISSING" };
    }

    const body = new URLSearchParams({ secret, response: tokenStr });
    if (opts.remoteIp) body.set("remoteip", opts.remoteIp);

    let json: SiteverifyResponse;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);
      try {
        const res = await this.http.siteverify(body, controller.signal);
        if (!res.ok) {
          throw new Error("turnstile_http_" + res.status);
        }
        json = res.json;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      this.log.error(
        "Turnstile siteverify unreachable: " +
          (err instanceof Error ? err.message : "unknown"),
      );
      return { ok: false, reason: "VERIFY_UNAVAILABLE" };
    }

    const judged = policy.evaluateSiteverify(json, {
      nodeEnv: env.turnstileSurface || env.nodeEnv,
      expectedAction: opts.expectedAction,
      nowMs: this.nowMs(),
    });
    if (!judged.ok) return judged;

    const tokenHash = hashTurnstileToken(tokenStr);
    try {
      const replayOk = await this.replayStore(env.redisUrl).consume(
        tokenHash,
        policy.REPLAY_TTL_MS,
      );
      if (!replayOk) return { ok: false, reason: "TOKEN_REPLAY" };
    } catch (err) {
      this.log.error(
        "Turnstile replay store unavailable: " +
          (err instanceof Error ? err.message : "unknown"),
      );
      return { ok: false, reason: "VERIFY_UNAVAILABLE" };
    }

    return { ok: true };
  }
}
