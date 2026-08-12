#!/usr/bin/env node
"use strict";
process.on("uncaughtException", (e) => {
  try {
    require("fs").writeSync(
      1,
      JSON.stringify({
        continue: true,
        permission: "deny",
        userMessage: "Blocked: read-boundary uncaught",
        agentMessage: String(e && e.message ? e.message : e),
      })
    );
  } catch (_) {}
  process.exit(0);
});
const fs = require("fs");
const { finishHook } = require("./lib/hook-io.cjs");
const {
  evaluatePathAccess,
  extractReadPath,
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
  const filePath = extractReadPath(payload);
  if (!Object.keys(payload || {}).length && !raw.trim()) {
    finishHook(
      deny(
        "Blocked: read-boundary empty input (fail-closed).",
        "Cannot evaluate read without payload."
      )
    );
  }
  if (Array.isArray(payload.attachments)) {
    for (let i = 0; i < payload.attachments.length; i++) {
      const a = payload.attachments[i];
      if (a && a.file_path) {
        const r = evaluatePathAccess(a.file_path);
        if (r.permission === "deny") finishHook(r);
      }
    }
  }
  if (filePath) {
    finishHook(evaluatePathAccess(filePath));
  }
  finishHook({ continue: true, permission: "allow" });
} catch (e) {
  finishHook(
    deny(
      "Blocked: read-boundary error",
      String(e && e.message ? e.message : e)
    )
  );
}
