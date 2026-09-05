/**
 * Cloudflare Turnstile server-side verification (Section 6.3).
 * https://developers.cloudflare.com/turnstile/
 *
 * Hard rule: this module NEVER auto-passes just because a secret is
 * missing - that direction (missing secret => allow) is exactly what
 * this task forbids. There is deliberately no "if (!secret) return
 * {success:true}" anywhere below.
 *
 * Test/CI usage needs zero special-casing in this file: Cloudflare
 * publishes its own well-known dummy sitekey/secret pair (see
 * developers.cloudflare.com/turnstile/troubleshooting/testing/) that
 * ALWAYS succeeds against the REAL siteverify endpoint. Playwright/CI
 * simply sets TURNSTILE_SECRET_KEY to that documented dummy value in its
 * own env; this service still makes a real network call to Cloudflare and
 * gets a real (deterministic) success response back - it never needs to
 * know it is talking to a test key, and no dummy value is hardcoded here.
 */

import { Injectable, Logger } from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5000;

export type TurnstileVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "NOT_CONFIGURED" | "TOKEN_MISSING" | "VERIFY_FAILED" | "VERIFY_UNAVAILABLE";
      errorCodes?: string[];
    };

type SiteverifyResponse = {
  success?: unknown;
  "error-codes"?: unknown;
  hostname?: unknown;
  action?: unknown;
};

@Injectable()
export class TurnstileService {
  private readonly log = new Logger(TurnstileService.name);

  configured(): boolean {
    return Boolean(loadPhase0Env().turnstileSecretKey);
  }

  async verify(
    token: unknown,
    opts: { remoteIp?: string } = {},
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
        const res = await fetch(SITEVERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("turnstile_http_" + res.status);
        }
        json = (await res.json()) as SiteverifyResponse;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      this.log.error(
        "Turnstile siteverify unreachable: " + (err instanceof Error ? err.message : "unknown"),
      );
      return { ok: false, reason: "VERIFY_UNAVAILABLE" };
    }

    if (json.success === true) {
      return { ok: true };
    }
    const errorCodes = Array.isArray(json["error-codes"])
      ? (json["error-codes"] as unknown[]).map(String)
      : [];
    return { ok: false, reason: "VERIFY_FAILED", errorCodes };
  }
}
