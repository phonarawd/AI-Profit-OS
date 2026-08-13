/**
 * Nest DI surface for the domain Clock seam (§QA4).
 *
 * `SystemClock` is the production/default path and returns real system time.
 * The injected `CLOCK` delegates to clock.core.cjs per call, so an acceptance
 * harness that installs a synthetic clock is observed by the very same code the
 * product runs — and the safety gate in clock.core.cjs is the only way in.
 *
 * Scope is deliberately narrow: only domain decision time (participation
 * cutoff, execution tick, referral day key, mission accrual/hold, day pulse).
 * Authentication time is NOT routed through here.
 */

import { Inject, Injectable } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";

export type Clock = {
  /** Epoch milliseconds for domain decisions. */
  nowMs(): number;
};

export type SyntheticClockGate = {
  ok: boolean;
  reason: string | null;
  checks: { id: string; ok: boolean; detail: string }[];
};

type ClockCore = {
  SYSTEM_CLOCK: Clock;
  evaluateSyntheticClockGate: (
    env?: NodeJS.ProcessEnv,
    hostname?: string,
  ) => SyntheticClockGate;
  setClock: (
    clock: Clock,
    opts?: { env?: NodeJS.ProcessEnv; hostname?: string },
  ) => { installed: true; gate: SyntheticClockGate };
  clearClock: () => void;
  withClock: <T>(
    clock: Clock,
    fn: () => T,
    opts?: { env?: NodeJS.ProcessEnv; hostname?: string },
  ) => T;
  createFixedClock: (ms: number) => Clock & { advanceMs: (d: number) => number };
  resolveClock: () => Clock;
  activeClockKind: () => "system" | "synthetic";
  nowMs: () => number;
  utcDayKey: (ms?: number) => string;
  kstDayKey: (ms?: number) => string;
  kstDayStartMs: (ms?: number) => number;
  addDaysMs: (ms: number, days: number) => number;
};

const requireCjs = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = requireCjs(join(__dirname, "..", "..", "clock.core.cjs")) as ClockCore;

/** DI token — inject with `@Inject(CLOCK) private readonly clock: Clock`. */
export const CLOCK = Symbol.for("aipo.common.clock");

/** Production/default clock: real system time, never virtualised. */
@Injectable()
export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
}

/**
 * The clock Nest hands to domain services. Reads through clock.core.cjs so a
 * governed synthetic override is visible, and falls back to real time otherwise.
 */
export function createRuntimeClock(): Clock {
  return { nowMs: () => core.nowMs() };
}

// Injectable seam used by the acceptance harness (clock-hook probe contract).
export function setClock(
  clock: Clock,
  opts?: { env?: NodeJS.ProcessEnv; hostname?: string },
) {
  return core.setClock(clock, opts);
}

export function withClock<T>(
  clock: Clock,
  fn: () => T,
  opts?: { env?: NodeJS.ProcessEnv; hostname?: string },
): T {
  return core.withClock(clock, fn, opts);
}

export function createClock(ms: number) {
  return core.createFixedClock(ms);
}

export function clearClock(): void {
  core.clearClock();
}

export function activeClockKind(): "system" | "synthetic" {
  return core.activeClockKind();
}

export function evaluateSyntheticClockGate(
  env?: NodeJS.ProcessEnv,
  hostname?: string,
): SyntheticClockGate {
  return core.evaluateSyntheticClockGate(env, hostname);
}

/** `YYYY-MM-DD` UTC day key (referral share ledger). */
export function utcDayKey(ms: number): string {
  return core.utcDayKey(ms);
}

/** `YYYY-MM-DD` Asia/Seoul day key (day pulse, accrual boundaries). */
export function kstDayKey(ms: number): string {
  return core.kstDayKey(ms);
}

export function kstDayStartMs(ms: number): number {
  return core.kstDayStartMs(ms);
}

export const CLOCK_PROVIDER = {
  provide: CLOCK,
  useFactory: createRuntimeClock,
};

/** Convenience for services that only need `new Date()` at a decision point. */
export function nowDate(clock: Clock): Date {
  return new Date(clock.nowMs());
}

export { Inject };
