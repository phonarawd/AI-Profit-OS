#!/usr/bin/env node
/** ADR-016 — inject Phase0 / RAM / brand / integrations */
const msg = [
  "ADR-016 session: Phase0 · 8GB RAM · Docker OFF default",
  "DB=Supabase Seoul mgsytcetsiecllmhcyox · Auth=Nest only · Host=Cloudflare only (no Vercel)",
  "Consumer brand=퍼뜩 · packageManager=pnpm@10.14 · next@16 · Tailwind v4",
  "Read AGENTS.md → 00 index → one domain plan · one todo per chat",
  "Done = verify PASS + cleanup PASS · commit requires verify:gate",
].join("\n");

process.stdout.write(
  JSON.stringify({
    continue: true,
    agentMessage: msg,
    userMessage: "Phase0 low-spec + Supabase/GitHub/CF lock active (ADR-016).",
  })
);
