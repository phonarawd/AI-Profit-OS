#!/usr/bin/env node
"use strict";
process.on("uncaughtException", (e) => {
  try {
    require("fs").writeSync(
      1,
      JSON.stringify({
        continue: true,
        permission: "deny",
        userMessage: "Blocked: pre-tool-boundary uncaught",
        agentMessage: String(e && e.message ? e.message : e),
      })
    );
  } catch (_) {}
  process.exit(0);
});
const fs = require("fs");
const { finishHook } = require("./lib/hook-io.cjs");
const {
  evaluateToolUse,
  deny,
} = require("./lib/project-boundary.cjs");
try {
  let raw = "";
  try {
    raw = fs.readFileSync(0, "utf8");
  } catch (_) {
    raw = "";
  }
  raw = String(raw || "").replace(/^\uFEFF/, "");
  let payload = {};
  try {
    payload = JSON.parse(raw.trim() || "{}");
  } catch (_) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        payload = JSON.parse(raw.slice(start, end + 1));
      } catch (_) {
        payload = {};
      }
    }
  }
  if (!Object.keys(payload || {}).length && !raw.trim()) {
    finishHook(deny("Blocked: empty hook input (fail-closed).", "stdin empty"));
  }
  finishHook(evaluateToolUse(payload));
} catch (e) {
  finishHook({
    continue: true,
    permission: "deny",
    userMessage: "Blocked: pre-tool-boundary error",
    agentMessage: String(e && e.message ? e.message : e),
  });
}
