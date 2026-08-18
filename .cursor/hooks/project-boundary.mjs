#!/usr/bin/env node
/**
 * Unified project-boundary hook — stdin JSON → allow|deny.
 * EMPTY → allow (lifecycle). NON-EMPTY malformed / policy/internal fail → deny.
 * Always process.exit(0) for decisions; import load fail → process failure (failClosed).
 */
import { runBoundaryHook } from "./lib/hook-io.mjs";
import { decideFromPayload } from "./lib/project-boundary-policy.mjs";

runBoundaryHook(decideFromPayload);
