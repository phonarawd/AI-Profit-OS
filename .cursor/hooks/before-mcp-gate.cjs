#!/usr/bin/env node
"use strict";
const fs = require("fs");
const { finishHook } = require("./lib/hook-io.cjs");
const { evaluateMcpCall, deny } = require("./lib/project-boundary.cjs");

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

  if (!Object.keys(payload || {}).length && !raw.trim()) {
    finish(
      deny(
        "Blocked: mcp-gate empty input (fail-closed).",
        "Cannot evaluate MCP without payload."
      )
    );
  }

  const rawLc = String(raw).toLowerCase();
  if (rawLc.indexOf("clime-gb") !== -1) {
    finish(
      deny(
        "Blocked: MCP references foreign project.",
        "phonarawd/AI-Profit-OS only."
      )
    );
  }
  if (
    rawLc.indexOf("qrvanbyjgflaugdaslqh") !== -1 ||
    rawLc.indexOf("yocjhjsdwoijfdrehzoq") !== -1
  ) {
    finish(
      deny(
        "Blocked: foreign Supabase project_ref.",
        "Allowed: mgsytcetsiecllmhcyox only."
      )
    );
  }

  finish(evaluateMcpCall(payload));
} catch (e) {
  finish(
    deny(
      "Blocked: mcp-boundary error",
      String(e && e.message ? e.message : e)
    )
  );
}
