#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { finishHook } = require("./lib/hook-io.cjs");
const {
  evaluatePathAccess,
  extractReadPath,
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

  const filePath = extractReadPath(payload);
  diag(
    new Date().toISOString() +
      " beforeReadSync keys=" +
      Object.keys(payload || {}).length +
      " path=" +
      JSON.stringify(String(filePath).slice(0, 160)) +
      " rawLen=" +
      String(raw.length)
  );

  if (!Object.keys(payload || {}).length && !raw.trim()) {
    finish(
      deny(
        "Blocked: read-boundary empty input (fail-closed).",
        "Cannot evaluate read without payload."
      )
    );
  }

  if (String(raw).toLowerCase().indexOf("clime-gb") !== -1) {
    finish(
      deny("Blocked: foreign project path.", "Stay inside AI_PROFIT_OS only.")
    );
  }

  if (Array.isArray(payload.attachments)) {
    for (let i = 0; i < payload.attachments.length; i++) {
      const a = payload.attachments[i];
      if (a && a.file_path) {
        const r = evaluatePathAccess(a.file_path);
        if (r.permission === "deny") finish(r);
      }
    }
  }

  if (filePath) {
    finish(evaluatePathAccess(filePath));
  }
  finish({ continue: true, permission: "allow" });
} catch (e) {
  finish(
    deny(
      "Blocked: read-boundary error",
      String(e && e.message ? e.message : e)
    )
  );
}
