#!/usr/bin/env node
/**
 * Unified project-boundary hook — stdin JSON → allow|deny.
 * EMPTY → allow (lifecycle). NON-EMPTY malformed / policy/internal fail → deny.
 * Always process.exit(0) for decisions; import load fail → process failure (failClosed).
 *
 * Isolation only. Night Guard is retired and is not composed here.
 */
import { runBoundaryHook } from "./lib/hook-io.mjs";
import { decideFromPayload as decideIsolation } from "./lib/project-boundary-policy.mjs";

function decideFromPayload(payload) {
  return decideIsolation(payload);
}

runBoundaryHook(decideFromPayload);
