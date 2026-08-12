#!/usr/bin/env node
"use strict";
/**
 * Legacy beforeReadFile entry — shared IO contract (empty→allow · malformed→deny).
 */
const { runBoundaryHook } = require("./lib/hook-io.cjs");
const {
  evaluatePathAccess,
  extractReadPath,
} = require("./lib/project-boundary.cjs");

runBoundaryHook(function (payload) {
  if (Array.isArray(payload.attachments)) {
    for (let i = 0; i < payload.attachments.length; i++) {
      const a = payload.attachments[i];
      if (a && a.file_path) {
        const r = evaluatePathAccess(a.file_path);
        if (r.permission === "deny") return r;
      }
    }
  }
  const filePath = extractReadPath(payload);
  if (filePath) return evaluatePathAccess(filePath);
  return { continue: true, permission: "allow" };
});
