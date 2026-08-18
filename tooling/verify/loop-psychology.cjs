/**
 * verify:loop-psychology — UI §51.24.9 L1~L24
 * DayPulse · PreCTA · Presence · G4 merge0 · abuse defenses
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function runChild(script) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    fails.push(`${script} failed`);
  }
}

// L1/L2/L16/L17/L18 — day-pulse-live-only
runChild("day-pulse-live-only.cjs");
// L7/L8/L9/L19/L24 — preflight-may-stop
runChild("preflight-may-stop.cjs");

const dayPulse = read("packages/ui/components/loop/DayPulse.tsx");
const precta = read("packages/ui/components/loop/PreCTA.tsx");
const loopCopy = read("packages/ui/copy/ko/loop.ts");
const daySvc = read("services/api-nest/src/loop/day-pulse.service.ts");
const ticker = read("packages/ui/components/lux/LivePayoutTicker.tsx");
/** PART9c — home slots may live in HomePageClient */
let home = read("apps/web/app/page.tsx");
for (const rel of [
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/_components/HomePageClient.tsx",
  "apps/web/components/HomePageClient.tsx",
]) {
  if (fs.existsSync(path.join(root, rel))) {
    home = `${home}\n${read(rel)}`;
    break;
  }
}
const dayWire = JSON.parse(
  read("packages/ui/canon/surfaces/day-pulse.wire.json") || "{}",
);

// L3/L5 — presence default OFF · no seed
if (daySvc && !daySvc.includes("PRESENCE_LIVE = false")) {
  fails.push("L3/L5: PRESENCE_LIVE must default false");
}
if (dayPulse && !dayPulse.includes('data-presence-default="off"')) {
  fails.push("L3: DayPulse must declare presence default off");
}
if (/Math\.random|seedPresence|fakeWaiters/i.test(daySvc + dayPulse)) {
  fails.push("L3/L5: random/seed presence forbidden");
}

// L4 — fake queue UI 금지
for (const rel of [
  "packages/ui/components/loop/DayPulse.tsx",
  "packages/ui/components/loop/PreCTA.tsx",
  "apps/web/app/page.tsx",
  "apps/web/app/HomePageClient.tsx",
]) {
  if (!fs.existsSync(path.join(root, rel))) continue;
  const t = read(rel);
  if (/대기열|줄서기|queuePosition|fakeQueue/i.test(t)) {
    fails.push(`L4: fake queue UI forbidden in ${rel}`);
  }
}

// L6 — presence/ticker slot 분리
if (home.includes("DayPulse") && home.includes("LivePayoutTicker")) {
  if (!home.includes('data-home-slot="ticker"') || !home.includes('data-home-slot="day-pulse"')) {
    fails.push("L6: ticker and day-pulse slots must be separate");
  }
}
if (ticker && !ticker.includes('data-day-pulse-merge="false"')) {
  fails.push("L6/L16: LivePayoutTicker must set data-day-pulse-merge=false");
}

// L10 — presentation≠payout pointer (PreCTA wire)
const pfWire = JSON.parse(
  read("packages/ui/canon/surfaces/preflight-confirm.wire.json") || "{}",
);
if (!(pfWire.forbidden || []).includes("presentation_timer_equals_payout")) {
  fails.push("L10: preflight wire must forbid presentation_timer_equals_payout");
}

// L11 — safe_stop ≠ 낙첨
const positiveLoop = loopCopy
  .replace(/forbiddenPhrases:\s*\[[\s\S]*?\],?/, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");
if (/낙첨|당첨\s*실패/.test(positiveLoop)) {
  fails.push("L11: safe_stop must not use 낙첨 framing");
}
if (dayPulse && /낙첨|실패했어요/.test(dayPulse)) {
  fails.push("L11: DayPulse must not frame safe_stop as failure lottery");
}

// L12/L13/L14/L15 — cross-surface pointers (no casino SFX / FOMO merge in loop)
if (/🎰|룰렛|jackpot|casino/i.test(dayPulse + precta + loopCopy)) {
  fails.push("L14: casino SFX/emoji forbidden in loop surfaces");
}

// L20 — 보장수익 배지 홈 금지
if (home && /보장\s*수익|100%\s*당첨/.test(home)) {
  fails.push("L20: guaranteed-profit badge forbidden on home");
}
if (!(dayWire.forbidden || []).includes("보장_수익_badge")) {
  fails.push("L20: day-pulse.wire must forbid 보장_수익_badge");
}

// L21 — orchestrateTruth (이베이에서 팔림 진행카피 0 in loop)
if (/이베이에서\s*팔림|실제로\s*팔렸어요/.test(dayPulse + precta + loopCopy)) {
  fails.push("L21: false listing progress copy forbidden in loop");
}

// L22 — IT jargon
if (/\b(API|NATS|DLQ|Mock|Staging)\b/.test(dayPulse + precta)) {
  fails.push("L22: IT jargon in DayPulse/PreCTA surface");
}

// L23 — 성별 FOMO 0
if (/남성|여성|남자|여자/.test(dayPulse + precta + positiveLoop)) {
  fails.push("L23: gender-branched FOMO copy forbidden");
}
if (!(dayWire.forbidden || []).includes("gender_branch")) {
  fails.push("L23: day-pulse.wire must forbid gender_branch");
}

// L24 — english code exposure
if (/PREFLIGHT_REQUIRED|COMPARE_NOT_READY/.test(dayPulse + precta)) {
  fails.push("L24: problem codes must not render in Pulse/PreCTA UI");
}

const toast = read("packages/ui/copy/ko/toast.ts");
if (toast && !toast.includes("PREFLIGHT_REQUIRED:")) {
  fails.push("L24: toast catalog must map PREFLIGHT_REQUIRED to Korean");
}

const manifest = read("packages/ui/canon/manifest.json");
if (manifest && !manifest.includes('"id": "day-pulse"')) {
  fails.push("canon manifest must register day-pulse");
}
if (manifest && !manifest.includes('"id": "preflight-confirm"')) {
  fails.push("canon manifest must register preflight-confirm");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (idx && !idx.includes('from "./loop"') && !idx.includes("from './loop'")) {
  fails.push("copy/ko/index.ts must export loop");
}

const pkg = read("packages/ui/package.json");
if (pkg && !pkg.includes('"./components/loop"')) {
  fails.push("package.json must export ./components/loop");
}

if (fails.length) {
  console.error("[verify:loop-psychology] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:loop-psychology] PASS (L1~L24 · DayPulse/PreCTA/presence)",
);
