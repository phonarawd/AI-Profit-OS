/**
 * §43.1 rate-limit-budgeter — TronGrid QPS / daily quota · backoff · circuit.
 * Protects free tier; never fans out per-address polls.
 */

import { TRONGRID_DAILY_BUDGET, TRONGRID_QPS_BUDGET } from "./constants";

export type BudgeterOptions = {
  qps?: number;
  dailyBudget?: number;
  now?: () => number;
};

export class RateLimitBudgeter {
  private readonly qps: number;
  private readonly dailyBudget: number;
  private readonly now: () => number;
  private windowStartMs = 0;
  private windowCount = 0;
  private dayKey = "";
  private dayCount = 0;
  private circuitOpenUntilMs = 0;
  private consecutiveRejects = 0;

  constructor(opts: BudgeterOptions = {}) {
    this.qps = opts.qps ?? TRONGRID_QPS_BUDGET;
    this.dailyBudget = opts.dailyBudget ?? TRONGRID_DAILY_BUDGET;
    this.now = opts.now ?? (() => Date.now());
  }

  /** Returns false when caller must backoff (no RPC). */
  tryAcquire(cost = 1): boolean {
    const t = this.now();
    if (t < this.circuitOpenUntilMs) return false;

    const day = new Date(t).toISOString().slice(0, 10);
    if (day !== this.dayKey) {
      this.dayKey = day;
      this.dayCount = 0;
    }
    if (this.dayCount + cost > this.dailyBudget) {
      this.trip(30_000);
      return false;
    }

    if (t - this.windowStartMs >= 1000) {
      this.windowStartMs = t;
      this.windowCount = 0;
    }
    if (this.windowCount + cost > this.qps) {
      this.consecutiveRejects += 1;
      if (this.consecutiveRejects >= 3) this.trip(5_000);
      return false;
    }

    this.windowCount += cost;
    this.dayCount += cost;
    this.consecutiveRejects = 0;
    return true;
  }

  /** HTTP 429 / upstream throttle */
  noteUpstreamThrottle(retryAfterMs = 10_000): void {
    this.trip(retryAfterMs);
  }

  isCircuitOpen(): boolean {
    return this.now() < this.circuitOpenUntilMs;
  }

  snapshot() {
    return {
      qps: this.qps,
      dailyBudget: this.dailyBudget,
      dayCount: this.dayCount,
      windowCount: this.windowCount,
      circuitOpen: this.isCircuitOpen(),
      circuitOpenUntilMs: this.circuitOpenUntilMs,
    };
  }

  private trip(ms: number): void {
    this.circuitOpenUntilMs = Math.max(
      this.circuitOpenUntilMs,
      this.now() + ms,
    );
  }
}
