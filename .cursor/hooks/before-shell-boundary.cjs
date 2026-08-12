#!/usr/bin/env node
"use strict";
const fs = require("fs");
const { finishHook } = require("./lib/hook-io.cjs");
const {
  evaluateShellCommand,
  extractShellCommand,
  deny,
} = require("./lib/project-boundary.cjs");

function out(d) {
  finishHook(d);
}

process.on("uncaughtException", (e) => {
  out(
    deny(
      "Blocked: shell-boundary uncaught",
      String(e && e.message ? e.message : e)
    )
  );
});

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
    out(deny("Blocked: shell-boundary empty input.", "fail-closed"));
  }
  if (raw.toLowerCase().indexOf("clime-gb") !== -1) {
    out(deny("Blocked: shell references foreign project.", "isolation"));
  }

  out(evaluateShellCommand(cmd, cwd, null));
} catch (e) {
  out(
    deny(
      "Blocked: shell-boundary error",
      String(e && e.message ? e.message : e)
    )
  );
}
