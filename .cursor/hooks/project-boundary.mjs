#!/usr/bin/env node
/**
 * Unified project-boundary hook — stdin JSON → allow|deny.
 * EMPTY → allow (lifecycle). NON-EMPTY malformed / policy/internal fail → deny.
 * Always process.exit(0) for decisions; import load fail → process failure (failClosed).
 */
import { runBoundaryHook } from "./lib/hook-io.mjs";
import { decideFromPayload as decideIsolation } from "./lib/project-boundary-policy.mjs";
import { decideNightGuard } from "./lib/night-guard-policy.mjs";

function decideFromPayload(payload) {
  const isolation = decideIsolation(payload);
  if (isolation && isolation.permission === "deny") return isolation;
  return decideNightGuard(payload);
}

runBoundaryHook(decideFromPayload);
