/**
 * HIBP Pwned Passwords check — k-anonymity range API (§6.1).
 * https://haveibeenpwned.com/API/v3#PwnedPasswords
 *
 * Never sends the plaintext password or a full hash of it anywhere. Only
 * the first 5 hex characters of SHA-1(password) are ever transmitted (the
 * "range" k-anonymity model); the full match is decided locally against the
 * ~a few hundred candidate suffixes HIBP returns for that prefix.
 *
 * This SHA-1 usage is UNRELATED to and must never be confused with password
 * *storage* hashing (see password-hash.ts, which uses scrypt) — SHA-1 here
 * exists only because it is the fixed hash HIBP's public corpus is indexed
 * by; it is never persisted, never used to verify a login.
 *
 * Fail behaviour: HIBP unreachable/non-200/timeout -> fall back to the small
 * local blocklist (pwned-password.local-blocklist.ts) and record the outage
 * via the injected logger — never silently treat an unreachable HIBP as "not
 * pwned" without at least the degraded local check, and never block signup
 * entirely just because a third-party API is down.
 */

import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { isOnLocalBlocklist } from "./pwned-password.local-blocklist";

export type PwnedCheckResult = {
  pwned: boolean;
  /** Approximate breach count from HIBP; 0 when sourced from the local
   * fallback (which has no count data, only a boolean membership check). */
  count: number;
  source: "hibp" | "local_fallback_outage" | "local_fallback_disabled";
};

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 3_000;

function sha1Hex(input: string): string {
  return createHash("sha1").update(input, "utf8").digest("hex").toUpperCase();
}

@Injectable()
export class PwnedPasswordService {
  private readonly log = new Logger(PwnedPasswordService.name);

  /** Overridable in tests only — never used to bypass a real check in prod. */
  constructor(private readonly enabled: boolean = true) {}

  async check(password: string): Promise<PwnedCheckResult> {
    if (!this.enabled) {
      return {
        pwned: isOnLocalBlocklist(password),
        count: 0,
        source: "local_fallback_disabled",
      };
    }
    const full = sha1Hex(password);
    const prefix = full.slice(0, 5);
    const suffix = full.slice(5);

    let body: string;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);
      try {
        const res = await fetch(HIBP_RANGE_URL + prefix, {
          method: "GET",
          headers: { "Add-Padding": "true" },
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`hibp_http_${res.status}`);
        }
        body = await res.text();
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      this.log.warn(
        `HIBP range lookup failed — falling back to local blocklist (outage recorded): ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
      return {
        pwned: isOnLocalBlocklist(password),
        count: 0,
        source: "local_fallback_outage",
      };
    }

    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const sepIdx = trimmed.indexOf(":");
      if (sepIdx < 0) continue;
      const candidateSuffix = trimmed.slice(0, sepIdx);
      if (candidateSuffix.toUpperCase() === suffix) {
        const count = Number(trimmed.slice(sepIdx + 1));
        return { pwned: true, count: Number.isFinite(count) ? count : 1, source: "hibp" };
      }
    }
    return { pwned: false, count: 0, source: "hibp" };
  }
}
