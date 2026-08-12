#!/usr/bin/env node
"use strict";
/**
 * Legacy preToolUse entry — same IO contract as project-boundary.mjs.
 * Active wiring uses project-boundary.mjs; kept for bak restore safety.
 */
const { runBoundaryHook } = require("./lib/hook-io.cjs");
const { evaluateToolUse } = require("./lib/project-boundary.cjs");

runBoundaryHook(evaluateToolUse);
