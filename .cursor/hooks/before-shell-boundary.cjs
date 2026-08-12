#!/usr/bin/env node
"use strict";
/**
 * Legacy beforeShellExecution entry — shared IO contract.
 */
const { runBoundaryHook } = require("./lib/hook-io.cjs");
const {
  evaluateShellCommand,
  extractShellCommand,
} = require("./lib/project-boundary.cjs");

runBoundaryHook(function (payload) {
  const cmd = extractShellCommand(payload);
  const cwd = payload.cwd || "";
  // Gate on command + cwd only (not full payload body).
  return evaluateShellCommand(cmd, cwd, null);
});
