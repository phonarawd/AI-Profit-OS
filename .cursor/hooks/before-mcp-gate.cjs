#!/usr/bin/env node
"use strict";
/**
 * Legacy beforeMCPExecution entry — shared IO contract.
 */
const { runBoundaryHook } = require("./lib/hook-io.cjs");
const { evaluateMcpCall } = require("./lib/project-boundary.cjs");

runBoundaryHook(evaluateMcpCall);
