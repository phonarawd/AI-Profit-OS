/**
 * 로컬 게이트 스탬프 — 같은 HEAD+더티 내용에서 이미 PASS한 스크립트 상위집합이면 재실행 생략.
 * 검사 약화가 아님. CI / GITHUB_ACTIONS / AIPO_GATE_NO_STAMP=1 에서는 항상 실실행.
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FALLBACK_ROOT = path.resolve(__dirname, "../../..");

const TIER_RANK = {
  "verify:gate:fast": 1,
  fast: 1,
  "verify:gate:push": 2,
  push: 2,
  "verify:gate": 3,
  full: 3,
};

function gitText(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function gitLines(cwd, args) {
  const text = gitText(cwd, args);
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => line.replace(/\\/g, "/"));
}

function gitToplevel(cwd) {
  const top = gitText(cwd, ["rev-parse", "--show-toplevel"]);
  return top || FALLBACK_ROOT;
}

function stampPath(cwd) {
  return path.join(gitToplevel(cwd), ".cache", "verify-gate-stamp.json");
}

function fileDigest(abs) {
  try {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return "missing";
    return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return "unreadable";
  }
}

function contentFingerprint(cwd) {
  const head = gitText(cwd, ["rev-parse", "HEAD"]);
  const names = new Set([
    ...gitLines(cwd, ["diff", "--name-only", "HEAD"]),
    ...gitLines(cwd, ["diff", "--cached", "--name-only"]),
    ...gitLines(cwd, ["ls-files", "-o", "--exclude-standard"]),
  ]);
  const sorted = [...names].sort();
  const hash = crypto.createHash("sha256");
  hash.update(head);
  hash.update("\n");
  for (const rel of sorted) {
    hash.update(rel);
    hash.update("\0");
    hash.update(fileDigest(path.join(cwd, rel)));
    hash.update("\n");
  }
  return { head, digest: hash.digest("hex"), files: sorted };
}

function ciLocked(env) {
  const e = env || process.env;
  return e.CI === "true" || e.GITHUB_ACTIONS === "true" || e.AIPO_GATE_NO_STAMP === "1";
}

function tierRank(label) {
  return TIER_RANK[label] || 0;
}

function readStamp(cwd) {
  const p = stampPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!raw || raw.v !== 1) return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * @returns {{ ok: boolean, reason: string }}
 */
function trySkip(label, scripts, opts) {
  const env = (opts && opts.env) || process.env;
  const cwd = (opts && opts.cwd) || FALLBACK_ROOT;
  if (ciLocked(env)) return { ok: false, reason: "ci-or-forced" };
  const stamp = readStamp(cwd);
  if (!stamp) return { ok: false, reason: "missing" };
  if (!Array.isArray(stamp.scripts) || !stamp.head || !stamp.digest) {
    return { ok: false, reason: "malformed" };
  }
  if (tierRank(stamp.label) < tierRank(label)) return { ok: false, reason: "tier" };
  const fp = contentFingerprint(cwd);
  if (stamp.head !== fp.head || stamp.digest !== fp.digest) {
    return { ok: false, reason: "fingerprint" };
  }
  const have = new Set(stamp.scripts);
  const need = [...new Set(scripts)];
  if (!need.every((step) => have.has(step))) return { ok: false, reason: "scripts" };
  return { ok: true, reason: "hit" };
}

function write(label, scripts, opts) {
  const env = (opts && opts.env) || process.env;
  const cwd = (opts && opts.cwd) || FALLBACK_ROOT;
  if (ciLocked(env)) return;
  const fp = contentFingerprint(cwd);
  const dir = path.dirname(stampPath(cwd));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    stampPath(cwd),
    JSON.stringify(
      {
        v: 1,
        label,
        head: fp.head,
        digest: fp.digest,
        scripts: [...new Set(scripts)],
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

module.exports = {
  trySkip,
  write,
  contentFingerprint,
  ciLocked,
  stampPath,
};
