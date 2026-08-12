#!/usr/bin/env node
/**
 * PRE-0 git-gate + hooks.json BOM regression (fixture only).
 * Does not create commits · does not mutate governance staged index.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const HOOK = path.join(ROOT, ".cursor", "hooks", "before-shell-git-gate.cjs");
const HOOKS_JSON = path.join(ROOT, ".cursor", "hooks.json");
const FOREIGN_DIR = "C:\\Users\\PC\\Desktop\\clime-gb";

/** Contract: under Cursor hook spawn budgets (pre0=8s · boundary=45s · git-gate=120s). */
const COMMIT_DECISION_MAX_MS = 2000;
const HOOK_SPAWN_TIMEOUT_MS = 8000;

const cases = [];

function expect(name, cond, detail) {
  cases.push({ name: name, pass: !!cond, detail: detail || "" });
}

function runGitGate(stdinObj, opts) {
  const stdin =
    typeof stdinObj === "string" ? stdinObj : JSON.stringify(stdinObj || {});
  const started = Date.now();
  const r = spawnSync(process.execPath, [HOOK], {
    cwd: (opts && opts.cwd) || ROOT,
    input: stdin,
    encoding: "utf8",
    timeout: HOOK_SPAWN_TIMEOUT_MS,
    windowsHide: true,
    env: Object.assign({}, process.env, {
      CURSOR_PROJECT_DIR: ROOT,
    }),
  });
  const ms = Date.now() - started;
  let json = null;
  try {
    json = JSON.parse(String(r.stdout || "").trim());
  } catch (_) {
    json = null;
  }
  return {
    status: r.status,
    signal: r.signal,
    error: r.error,
    stdout: String(r.stdout || ""),
    stderr: String(r.stderr || ""),
    permission: json && json.permission,
    json: json,
    ms: ms,
  };
}

function validateHooksJsonBytes(buf) {
  if (!buf || !buf.length) {
    return { ok: false, reason: "empty" };
  }
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { ok: false, reason: "utf8_bom" };
  }
  try {
    const text = buf.toString("utf8");
    // Strict: reject BOM even if JSON.parse would strip via replace
    if (text.charCodeAt(0) === 0xfeff) {
      return { ok: false, reason: "utf8_bom_char" };
    }
    JSON.parse(text);
    return { ok: true, reason: "pass" };
  } catch (e) {
    return { ok: false, reason: "json_syntax:" + (e && e.message) };
  }
}

// --- A. local cwd + git status => ALLOW ---
{
  const r = runGitGate({ command: "git status --short", cwd: ROOT });
  expect(
    "A local git status ALLOW",
    r.status === 0 && r.permission === "allow",
    "status=" + r.status + " perm=" + r.permission + " ms=" + r.ms
  );
}

// --- B. local cwd + git diff => ALLOW ---
{
  const r = runGitGate({ command: "git diff --cached --name-status", cwd: ROOT });
  expect(
    "B local git diff ALLOW",
    r.status === 0 && r.permission === "allow",
    "status=" + r.status + " perm=" + r.permission + " ms=" + r.ms
  );
}

// --- C. local cwd + git commit -m fixture => ALLOW decision (no real commit) ---
{
  const r = runGitGate({
    command: 'git commit -m "fixture-hook-decision-only"',
    cwd: ROOT,
  });
  expect(
    "C local git commit decision ALLOW",
    r.status === 0 && r.permission === "allow",
    "status=" + r.status + " perm=" + r.permission + " ms=" + r.ms
  );
}

// --- D. foreign cwd + git commit => DENY ---
{
  const r = runGitGate({
    command: 'git commit -m "fixture"',
    cwd: FOREIGN_DIR,
  });
  expect(
    "D foreign cwd git commit DENY",
    r.status === 0 && r.permission === "deny",
    "status=" + r.status + " perm=" + r.permission
  );
}

// --- E. local cwd + git -C foreign commit => DENY ---
{
  const r = runGitGate({
    command: 'git -C "' + FOREIGN_DIR + '" commit -m "fixture"',
    cwd: ROOT,
  });
  expect(
    "E git -C foreign commit DENY",
    r.status === 0 && r.permission === "deny",
    "status=" + r.status + " perm=" + r.permission
  );
}

// --- F. git commit --no-verify => DENY ---
{
  const r = runGitGate({
    command: 'git commit --no-verify -m "fixture"',
    cwd: ROOT,
  });
  expect(
    "F git commit --no-verify DENY",
    r.status === 0 && r.permission === "deny",
    "status=" + r.status + " perm=" + r.permission
  );
}

// --- G. hooks.json UTF-8 BOM => validation FAIL ---
{
  const bomBody = Buffer.from(
    JSON.stringify({ version: 1, hooks: {} }, null, 2),
    "utf8"
  );
  const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bomBody]);
  const v = validateHooksJsonBytes(withBom);
  expect(
    "G hooks.json UTF-8 BOM validation FAIL",
    v.ok === false && v.reason === "utf8_bom",
    "reason=" + v.reason
  );
}

// --- H. normal hooks.json => validation PASS ---
{
  const actual = fs.readFileSync(HOOKS_JSON);
  const v = validateHooksJsonBytes(actual);
  expect(
    "H normal hooks.json validation PASS",
    v.ok === true,
    "reason=" + v.reason + " len=" + actual.length
  );
}

// --- I. local commit decision latency bounded ---
{
  const r = runGitGate({
    command: 'git commit -m "fixture-latency"',
    cwd: ROOT,
  });
  expect(
    "I local commit decision latency bounded",
    r.status === 0 &&
      r.permission === "allow" &&
      r.ms <= COMMIT_DECISION_MAX_MS &&
      !(r.error && r.error.code === "ETIMEDOUT"),
    "ms=" + r.ms + " max=" + COMMIT_DECISION_MAX_MS + " perm=" + r.permission
  );
}

// --- repeated stability x5 ---
const reps = [];
let stable = true;
let maxMs = 0;
for (let i = 0; i < 5; i++) {
  const r = runGitGate({
    command: 'git commit -m "fixture-stability-' + i + '"',
    cwd: ROOT,
  });
  reps.push({ status: r.status, permission: r.permission, ms: r.ms });
  if (r.status !== 0 || r.permission !== "allow") stable = false;
  if (r.ms > maxMs) maxMs = r.ms;
  if (
    i > 0 &&
    (r.status !== reps[0].status || r.permission !== reps[0].permission)
  ) {
    stable = false;
  }
}
expect(
  "repeated local commit permission stability x5",
  stable,
  JSON.stringify(reps)
);

// Husky T0/T1 authority still present (bypass guard)
{
  const preCommit = path.join(ROOT, ".husky", "pre-commit");
  const body = fs.existsSync(preCommit)
    ? fs.readFileSync(preCommit, "utf8")
    : "";
  expect(
    "husky pre-commit still runs verify:gate:fast",
    /verify:gate:fast/.test(body),
    body.trim().slice(0, 80)
  );
}

{
  const prePush = path.join(ROOT, ".husky", "pre-push");
  const body = fs.existsSync(prePush) ? fs.readFileSync(prePush, "utf8") : "";
  expect(
    "husky pre-push still runs verify:gate:push",
    /verify:gate:push/.test(body),
    body.trim().slice(0, 80)
  );
}

// --- J. local git push decision ALLOW (no T1 in Cursor hook) ---
{
  const r = runGitGate({
    command: "git push origin HEAD",
    cwd: ROOT,
  });
  expect(
    "J local git push decision ALLOW",
    r.status === 0 && r.permission === "allow",
    "status=" + r.status + " perm=" + r.permission + " ms=" + r.ms
  );
}

// --- K. git push --no-verify => DENY ---
{
  const r = runGitGate({
    command: "git push --no-verify origin HEAD",
    cwd: ROOT,
  });
  expect(
    "K git push --no-verify DENY",
    r.status === 0 && r.permission === "deny",
    "status=" + r.status + " perm=" + r.permission
  );
}

const failed = cases.filter((c) => !c.pass);
const localCommit = cases.find((c) => c.name.indexOf("C local") === 0);
const report = {
  PRE0_GIT_REGRESSION: failed.length === 0 ? "PASS" : "FAIL",
  LOCAL_GIT_COMMIT_PERMISSION:
    localCommit && localCommit.pass ? "ALLOW" : "DENY_OR_FAIL",
  REPEATED_STABILITY: stable ? "PASS" : "FAIL",
  COMMIT_DECISION_MAX_MS: COMMIT_DECISION_MAX_MS,
  LOCAL_GIT_COMMIT_DECISION_LATENCY_MAX_MS: maxMs,
  cases: cases,
  temp_dir_unused: os.tmpdir(),
  failClosed: true,
  heavy_t0_location: ".husky/pre-commit → pnpm verify:gate:fast",
  heavy_t1_location: ".husky/pre-push → pnpm verify:gate:push",
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(failed.length === 0 && stable ? 0 : 1);
