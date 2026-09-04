#!/usr/bin/env node
/**
 * Unified project-boundary hook — stdin JSON → allow|deny.
 * EMPTY → allow (lifecycle). NON-EMPTY malformed / policy/internal fail → deny.
 * Always process.exit(0) for decisions; import load fail → process failure (failClosed).
 *
 * Founder 승인 채널: 로컬 gitignored 파일 `.cursor/night-guard.founder-auth.local.json`.
 * 읽기/파싱/검증 실패 = 승인 없음(기존 DENY와 동일). 정책 함수는 순수 · I/O는 여기서만.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBoundaryHook } from "./lib/hook-io.mjs";
import { decideFromPayload as decideIsolation } from "./lib/project-boundary-policy.mjs";
import { decideNightGuard, validateFounderAuth } from "./lib/night-guard-policy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FOUNDER_AUTH_FILE = path.resolve(HERE, "..", "night-guard.founder-auth.local.json");

function loadFounderAuth() {
  try {
    if (!fs.existsSync(FOUNDER_AUTH_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(FOUNDER_AUTH_FILE, "utf8").replace(/^\uFEFF/, ""));
    const v = validateFounderAuth(raw, Date.now());
    return v.valid ? v : null;
  } catch {
    return null;
  }
}

function decideFromPayload(payload) {
  const isolation = decideIsolation(payload);
  if (isolation && isolation.permission === "deny") return isolation;
  return decideNightGuard(payload, { founderAuth: loadFounderAuth() });
}

runBoundaryHook(decideFromPayload);
