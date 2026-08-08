#!/usr/bin/env node
/** ADR-016 — inject Phase0 / RAM / brand / integrations + live free-RAM warn */
const os = require("os");

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
  "DB=Supabase Seoul mgsytcetsiecllmhcyox · Auth=Nest only · Host=Cloudflare only (no Vercel)",
  "Consumer brand=퍼뜩 · pnpm@10.14 · next@16 · Tailwind v4",
  "NODE_OPTIONS=--max-old-space-size=1536 · agents parallel=0 · explore max 1",
  "Read AGENTS.md → 00 index → one domain plan · one todo per chat",
  "Done = verify PASS + cleanup PASS · commit requires verify:gate",
  "Status: pnpm lowspec:status",
].join("\n");

process.stdout.write(
  JSON.stringify({
    continue: true,
    agentMessage: msg,
    userMessage: "Phase0 low-spec (Celeron/8GB) + Supabase/GitHub/CF lock active (ADR-016).",
  })
);
