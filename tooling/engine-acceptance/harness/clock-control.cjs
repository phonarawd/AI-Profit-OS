/**
 * QA4 synthetic clock control — harness only · 제품 mutation 0.
 *
 * Requires services/api-nest/clock.core.cjs from the SAME absolute path the
 * product's compiled dist/common/clock.js resolves it from
 * (join(__dirname, "..", "..", "clock.core.cjs") relative to dist/common).
 * When the harness ALSO boots Nest in-process (harness/ci-nest-boot.cjs
 * startNestInProcess — no child process), both sides land in the exact same
 * Node module cache entry, so installing a synthetic clock here is observed
 * by the very domain services the product runs.
 *
 * The fail-closed AND gate itself lives in clock.core.cjs
 * (evaluateSyntheticClockGate) — this module never weakens or bypasses it;
 * it only supplies the env values a QA harness is expected to pass.
 */
"use strict";

const path = require("node:path");
const { ROOT } = require("../lib/hash-scope.cjs");

const CLOCK_CORE_REL = "services/api-nest/clock.core.cjs";

function loadClockCore() {
  return require(path.join(ROOT, CLOCK_CORE_REL));
}

/**
 * @param {{ syntheticNs?: string, targetEnv?: string, hostname?: string, nodeEnv?: string }} [opts]
 */
function buildSafeQaEnv(opts = {}) {
  return {
    NODE_ENV: opts.nodeEnv || "test",
    AIPO_QA_CLOCK_ENABLE: "1",
    AIPO_QA_SYNTHETIC_NS: opts.syntheticNs || "qa-synth-local",
    AIPO_QA_TARGET_ENV: opts.targetEnv || "local",
    AIPO_QA_HOSTNAME: opts.hostname || "localhost",
  };
}

/**
 * Installs a fixed-instant synthetic clock. Throws (does not silently
 * fall back to system time) if clock.core.cjs's fail-closed gate denies it —
 * exactly the behaviour a real QA harness must have.
 *
 * @param {number} ms
 * @param {{ syntheticNs?: string, targetEnv?: string, hostname?: string }} [opts]
 */
function installSyntheticClock(ms, opts = {}) {
  const core = loadClockCore();
  const qaEnv = buildSafeQaEnv(opts);
  Object.assign(process.env, qaEnv);
  const clock = core.createFixedClock(ms);
  const installed = core.setClock(clock, { env: process.env, hostname: qaEnv.AIPO_QA_HOSTNAME });
  return { clock, gate: installed.gate, core };
}

function clearSyntheticClock() {
  loadClockCore().clearClock();
}

function activeClockKind() {
  return loadClockCore().activeClockKind();
}

/** Pure evaluation (no install) — used for the security-gate matrix proof. */
function evaluateGate(env, hostname) {
  return loadClockCore().evaluateSyntheticClockGate(env, hostname);
}

module.exports = {
  CLOCK_CORE_REL,
  loadClockCore,
  buildSafeQaEnv,
  installSyntheticClock,
  clearSyntheticClock,
  activeClockKind,
  evaluateGate,
};
