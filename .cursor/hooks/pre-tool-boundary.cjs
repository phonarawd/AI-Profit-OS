#!/usr/bin/env node
"use strict";
/**
 * Sync stdin + BOM strip. failClosed: decision via JSON permission; always exit 0.
 */
const fs = require("fs");
const path = require("path");
const { finishHook } = require("./lib/hook-io.cjs");
const {
  evaluateToolUse,
  extractShellCommand,
  deny,
} = require("./lib/project-boundary.cjs");

function diag(line) {
  try {
    fs.appendFileSync(path.join(__dirname, "hook-diag.log"), line + "\n", "utf8");
  } catch (_) {}
}

function finish(d) {
  finishHook(d);
}

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

  const tool = String((payload && (payload.tool_name || payload.toolName)) || "");
  const cmd = String(extractShellCommand(payload) || "").slice(0, 120);
  diag(
    new Date().toISOString() +
      " preToolUseSync tool=" +
      tool +
      " keys=" +
      Object.keys(payload || {}).length +
      " cmd=" +
      JSON.stringify(cmd) +
      " rawLen=" +
      String(raw.length)
  );

  if (!Object.keys(payload || {}).length && !raw.trim()) {
    finish(deny("Blocked: empty hook input (fail-closed).", "stdin empty"));
  }

  if (tool === "Shell" && cmd.toLowerCase().indexOf("clime-gb") !== -1) {
    finish(
      deny(
        "Blocked: shell references foreign project.",
        "AI_PROFIT_OS isolation."
      )
    );
  }

  finish(evaluateToolUse(payload));
} catch (e) {
  finish({
    continue: true,
    permission: "deny",
    userMessage: "Blocked: pre-tool-boundary error",
    agentMessage: String(e && e.message ? e.message : e),
  });
}
