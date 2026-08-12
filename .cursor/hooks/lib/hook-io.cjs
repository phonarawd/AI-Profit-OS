/**
 * Cursor hook I/O — sync stdout + always exit 0.
 * Buffered process.stdout.write + process.exit races on Windows (failClosed exit 1).
 * Non-zero exit (e.g. deny→2) is also treated as hook failure under failClosed.
 * Decision lives in JSON `permission` only (sibling: before-shell-git-gate).
 */
"use strict";

const fs = require("fs");

function writeHookResponse(obj) {
  const x =
    obj && typeof obj === "object" && obj.permission
      ? obj
      : { continue: true, permission: "allow" };
  const line = JSON.stringify(x);
  try {
    fs.writeSync(1, line);
  } catch (_) {
    try {
      process.stdout.write(line);
    } catch (_) {}
  }
  return x;
}

function finishHook(obj) {
  writeHookResponse(obj);
  process.exit(0);
}

module.exports = {
  writeHookResponse: writeHookResponse,
  finishHook: finishHook,
};
