#!/usr/bin/env node
"use strict";
process.on("uncaughtException", (e) => {
  try {
    require("fs").writeSync(
      1,
      JSON.stringify({
        continue: true,
        permission: "deny",
        userMessage: "Blocked: shell-boundary uncaught",
        agentMessage: String(e && e.message ? e.message : e),
      })
    );
  } catch (_) {}
  process.exit(0);
});
const fs = require("fs");
const { finishHook } = require("./lib/hook-io.cjs");
const {
  evaluateShellCommand,
  extractShellCommand,
  deny,
} = require("./lib/project-boundary.cjs");
try {
  let raw = "";
  try {
    raw = fs.readFileSync(0, "utf8");
  } catch (_) {
    raw = "";
  }
  raw = String(raw || "").replace(/^\uFEFF/, "").trim();
  let payload = {};
  try {
    payload = JSON.parse(raw || "{}");
  } catch (_) {
    payload = {};
  }
  const cmd = extractShellCommand(payload);
  const cwd = payload.cwd || process.cwd();
  if (!raw) {
    finishHook(deny("Blocked: shell-boundary empty input.", "fail-closed"));
  }
  // Gate on extracted command + cwd only (not full payload body).
  finishHook(evaluateShellCommand(cmd, cwd, null));
} catch (e) {
  finishHook(
    deny(
      "Blocked: shell-boundary error",
      String(e && e.message ? e.message : e)
    )
  );
}
