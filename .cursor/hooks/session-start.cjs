#!/usr/bin/env node
/** ADR-016 — inject Phase0 / RAM / brand / integrations + live free-RAM warn */
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
let plansSync = "plans sync skipped";
try {
  const r = spawnSync(
    process.execPath,
    [path.join(root, "tooling/cursor/sync-plans-ssot.cjs"), "--quiet"],
    { cwd: root, encoding: "utf8", timeout: 12000 },
  );
  plansSync =
    r.status === 0
      ? "plans SSOT: workspace → home synced"
      : `plans SSOT sync WARN: ${(r.stderr || r.stdout || "").slice(0, 200)}`;
} catch (e) {
  plansSync = `plans SSOT sync WARN: ${e.message}`;
}

const freeGB = os.freemem() / 1024 ** 3;
const totalGB = os.totalmem() / 1024 ** 3;
const ramLine =
  freeGB < 1.0
    ? `RAM CRITICAL: free ${freeGB.toFixed(2)}/${totalGB.toFixed(2)} GB — cleanup first, no local server`
    : freeGB < 1.5
      ? `RAM WARN: free ${freeGB.toFixed(2)}/${totalGB.toFixed(2)} GB — single process only`
      : `RAM OK: free ${freeGB.toFixed(2)}/${totalGB.toFixed(2)} GB`;

const msg = [
  "ADR-016 session: Phase0 · this PC = Celeron 2C/8GB · Docker OFF",
  ramLine,
  plansSync,
  "Plan SSOT = workspace .cursor/plans only · home mirror auto-sync · edit *_ssot stubs 금지",
  "DB=Supabase Seoul mgsytcetsiecllmhcyox · Auth=Nest only · Host=Cloudflare only (no Vercel)",
  "Consumer brand=퍼뜩 · pnpm@10.14 · next@16 · Tailwind v4",
  "NODE_OPTIONS=--max-old-space-size=1536 · agents parallel=0 · explore max 1",
  "Read AGENTS.md → 00 index → one domain plan · one todo per chat",
  "Done = 슬라이스: domain verify + T0 commit · 세션: cleanup (+ push 시 CI green)",
  "commit → verify:gate:fast · push → verify:gate:push · CI → verify:gate",
  "Status: pnpm lowspec:status · plans: pnpm cursor:sync-plans",
].join("\n");

process.stdout.write(
  JSON.stringify({
    continue: true,
    agentMessage: msg,
    userMessage: "Phase0 low-spec (Celeron/8GB) + Supabase/GitHub/CF lock active (ADR-016).",
  })
);
