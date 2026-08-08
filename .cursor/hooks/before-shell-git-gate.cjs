#!/usr/bin/env node
/**
 * beforeShellExecution — deny dirty git commit/push; allow after verify:gate
 * permission: deny is the reliable Cursor gate (ask is unreliable).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let input = "";
try {
  input = fs.readFileSync(0, "utf8");
} catch {
  input = "{}";
}

let payload = {};
try {
  payload = JSON.parse(input || "{}");
} catch {
  payload = {};
}

const cmd = String(payload.command || "");
const root = process.cwd();

function out(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
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
  // any git add/commit/rm that mentions .env (except .env.example)
  if (!/\bgit\s+(add|commit|rm|update-index)\b/.test(c)) return false;
  if (/\.env\.example\b/.test(c) && !/\.env(?!\.example)\b/.test(c)) return false;
  return (
    /(^|[\s"'])\.env\b/.test(c) ||
    /\.env\.(local|production|development|test|rc)\b/.test(c) ||
    /\bgit\s+add\s+(-[A-Za-z]*f[A-Za-z]*|--force)\b/.test(c) &&
      /\.env\b/.test(c)
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

if (hasNoVerify(cmd)) {
  out({
    continue: true,
    permission: "deny",
    userMessage: "Blocked: --no-verify / --no-gpg-sign forbidden (ADR-016).",
    agentMessage: "Remove --no-verify and run pnpm verify:gate before commit/push.",
  });
}

if (touchesEnv(cmd) || forceAddSecrets(cmd)) {
  out({
    continue: true,
    permission: "deny",
    userMessage: "Blocked: .env / secret files must not be staged/committed.",
    agentMessage: "Unstage secrets. .env stays local only (ADR-016).",
  });
}

if (isGitCommit(cmd) || isGitPush(cmd)) {
  try {
    execSync("pnpm verify:gate", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      timeout: 110000,
    });
  } catch (e) {
    const err = (e.stdout || e.stderr || e.message || "").toString().slice(0, 1500);
    out({
      continue: true,
      permission: "deny",
      userMessage: "Blocked: verify:gate failed — fix before commit/push.",
      agentMessage: `verify:gate FAIL:\n${err}`,
    });
  }
}

out({ continue: true, permission: "allow" });
