#!/usr/bin/env node
/**
 * beforeShellExecution — git permission gate (ADR-016)
 *
 * Critical-path (fast, deterministic):
 *   - foreign cwd / git -C foreign / foreign ref markers → deny
 *   - --no-verify / --no-gpg-sign → deny
 *   - secret/.env stage-commit patterns → deny
 *   - local repo identity check
 *   - malformed stdin → deny (failClosed)
 *   - local git commit → allow (heavy T0 = Husky pre-commit)
 *
 * Heavy verification (not in Cursor spawn budget):
 *   - T0 verify:gate:fast → .husky/pre-commit
 *   - T1 verify:gate:push → .husky/pre-push
 * Cursor git-gate = permission only (foreign / --no-verify / secrets).
 * T1 exceeds the 120s beforeShellExecution budget, so it must not run here.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {
  evaluateShellCommand,
  WORKSPACE_ROOT: BOUNDARY_ROOT,
} = require("./lib/project-boundary.cjs");

const HOOK_DERIVED_ROOT = path.resolve(__dirname, "..", "..");

function out(obj) {
  const line = JSON.stringify(obj);
  try {
    fs.writeSync(1, line);
  } catch (_) {
    try {
      process.stdout.write(line);
    } catch (_) {}
  }
  process.exit(0);
}

function deny(userMessage, agentMessage) {
  out({
    continue: true,
    permission: "deny",
    userMessage,
    user_message: userMessage,
    agentMessage: agentMessage || userMessage,
    agent_message: agentMessage || userMessage,
  });
}

function allow() {
  out({ continue: true, permission: "allow" });
}

function stripBom(s) {
  return String(s || "").replace(/^\uFEFF/, "");
}

function norm(p) {
  if (!p) return "";
  try {
    return path.resolve(String(p));
  } catch {
    return String(p);
  }
}

function lower(p) {
  return String(p || "").toLowerCase();
}

function isUnder(absPath, root) {
  const a = lower(norm(absPath));
  const r = lower(norm(root));
  if (!a || !r) return false;
  return (
    a === r ||
    a.startsWith(r + path.sep.toLowerCase()) ||
    a.startsWith(r + "\\") ||
    a.startsWith(r + "/")
  );
}

function looksForeign(blob) {
  const s = String(blob || "");
  if (!s) return false;
  if (/clime-gb/i.test(s)) return true;
  if (/phonarawd\/clime-gb/i.test(s)) return true;
  if (/qrvanbyjgflaugdaslqh/i.test(s)) return true;
  return false;
}

/**
 * executionRoot: where heavy local verify may run (never overwritten by foreign cwd)
 * Priority: validated CURSOR_PROJECT_DIR → hook-derived → boundary helper root
 */
function resolveExecutionRoot() {
  const candidates = [];
  const envRoot = process.env.CURSOR_PROJECT_DIR;
  if (envRoot && String(envRoot).trim()) candidates.push(norm(envRoot));
  candidates.push(HOOK_DERIVED_ROOT);
  if (BOUNDARY_ROOT) candidates.push(norm(BOUNDARY_ROOT));

  for (const c of candidates) {
    if (!c || looksForeign(c)) continue;
    // Must match known AI_PROFIT_OS roots (hook-derived / boundary)
    if (
      isUnder(c, HOOK_DERIVED_ROOT) ||
      isUnder(HOOK_DERIVED_ROOT, c) ||
      (BOUNDARY_ROOT &&
        (isUnder(c, BOUNDARY_ROOT) || isUnder(BOUNDARY_ROOT, c)))
    ) {
      // Prefer exact repo root when CURSOR_PROJECT_DIR points at workspace
      if (
        lower(c) === lower(HOOK_DERIVED_ROOT) ||
        lower(c) === lower(BOUNDARY_ROOT)
      ) {
        return c;
      }
    }
  }
  return HOOK_DERIVED_ROOT;
}

function requestedCwd(payload) {
  return (
    (payload && payload.cwd) ||
    (payload &&
      payload.tool_input &&
      (payload.tool_input.working_directory || payload.tool_input.cwd)) ||
    ""
  );
}

function isGitCommit(c) {
  return /\bgit\s+commit\b/.test(c);
}
function isGitPush(c) {
  return /\bgit\s+push\b/.test(c);
}
function hasNoVerify(c) {
  return /--no-verify|--no-gpg-sign/.test(c);
}
function touchesEnv(c) {
  if (!/\bgit\s+(add|commit|rm|update-index)\b/.test(c)) return false;
  if (/\.env\.example\b/.test(c) && !/\.env(?!\.example)\b/.test(c)) return false;
  return (
    /(^|[\s"'])\.env\b/.test(c) ||
    /\.env\.(local|production|development|test|rc)\b/.test(c) ||
    (/\bgit\s+add\s+(-[A-Za-z]*f[A-Za-z]*|--force)\b/.test(c) && /\.env\b/.test(c))
  );
}
function forceAddSecrets(c) {
  return (
    /\bgit\s+add\b/.test(c) &&
    /(-[A-Za-z]*f[A-Za-z]*|--force)/.test(c) &&
    /(\.env\b|\.pem\b|\.key\b|credentials\.json|service_account\.json)/.test(c) &&
    !/\.env\.example\b/.test(c)
  );
}

let raw = "";
try {
  raw = stripBom(fs.readFileSync(0, "utf8"));
} catch {
  raw = "";
}

if (!String(raw || "").trim()) {
  allow();
}

let payload = null;
try {
  payload = JSON.parse(String(raw).trim());
} catch {
  deny(
    "Blocked: malformed hook input.",
    "Non-empty stdin failed JSON parse — deny (failClosed)."
  );
}

if (!payload || typeof payload !== "object") {
  deny(
    "Blocked: malformed hook input.",
    "Hook payload must be a JSON object — deny (failClosed)."
  );
}

const cmd = String(payload.command || "");
const cwd = String(requestedCwd(payload) || "");
const executionRoot = resolveExecutionRoot();

// Local repository identity / foreign rejection (defense-in-depth; boundary hook also runs)
if (cwd) {
  if (looksForeign(cwd) || !isUnder(cwd, executionRoot)) {
    deny(
      "Blocked: shell cwd outside AI_PROFIT_OS.",
      "cwd must stay under " + executionRoot
    );
  }
}

if (looksForeign(cmd)) {
  deny(
    "Blocked: shell targets clime-gb / foreign FS path.",
    "AI_PROFIT_OS isolation."
  );
}

const boundaryShell = evaluateShellCommand(cmd, cwd || executionRoot, null);
if (boundaryShell && boundaryShell.permission === "deny") {
  out(boundaryShell);
}

if (hasNoVerify(cmd)) {
  deny(
    "Blocked: --no-verify / --no-gpg-sign forbidden (ADR-016).",
    "Remove --no-verify. commit=T0 via Husky pre-commit · push=T1 gate before push."
  );
}

if (touchesEnv(cmd) || forceAddSecrets(cmd)) {
  deny(
    "Blocked: .env / secret files must not be staged/committed.",
    "Unstage secrets. .env stays local only (ADR-016)."
  );
}

// Local commit/push: permission only.
// Heavy T0 = .husky/pre-commit → pnpm verify:gate:fast
// Heavy T1 = .husky/pre-push → pnpm verify:gate:push
if (isGitCommit(cmd) || isGitPush(cmd)) {
  allow();
}

allow();
