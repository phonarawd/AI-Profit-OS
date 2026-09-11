/**
 * BACKEND-ONLY PORT of tooling/verify/day-pulse-live-only.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:day-pulse-live-only — UI §51.24.1
 * DayPulse = ledger/settlement live only · G4 demo/hybrid/blended merge 0
 * Admin DayPulse 수동 편집 UI 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "schemas/day-opportunity-pulse.v1.json",
  "services/api-nest/src/loop/day-pulse.service.ts",
  "services/api-nest/src/loop/day-pulse.user.controller.ts",
];
for (const f of files) mustExist(f);

const schema = JSON.parse(
  read("schemas/day-opportunity-pulse.v1.json") || "{}",
);
if (schema.properties?.source?.const !== "live") {
  fails.push("day-opportunity-pulse.v1 source must be const live");
}
if (schema.properties?.g4Merge?.const !== false) {
  fails.push("day-opportunity-pulse.v1 g4Merge must be const false");
}
for (const need of [
  "platformSafeStopToday",
  "settlementCompletedToday",
  "presence",
]) {
  if (!(schema.required || []).includes(need)) {
    fails.push(`day-opportunity-pulse.v1 must require ${need}`);
  }
}

const svc = read("services/api-nest/src/loop/day-pulse.service.ts");
for (const needle of [
  "trade_executions",
  "safe_stop",
  "success",
  "g4Merge: false",
  'source: "live"',
  "PRESENCE_LIVE",
  "Asia/Seoul",
]) {
  if (svc && !svc.includes(needle)) {
    fails.push(`day-pulse.service missing: ${needle}`);
  }
}
const svcCode = svc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
if (/PublicTickerEvent|counter_mode|ticker_mode|demoTotal|blendedTotal/i.test(svcCode)) {
  fails.push("day-pulse.service must not reference G4 ticker/counter merge paths");
}

// <- loop-psychology.cjs (86f15964) L3/L5 - Nest service side only (DayPulse.tsx side handed off)
if (svc && !svc.includes("PRESENCE_LIVE = false")) {
  fails.push("L3/L5: PRESENCE_LIVE must default false (loop-psychology)");
}
if (/Math\.random|seedPresence|fakeWaiters/i.test(svc)) {
  fails.push("L3/L5: random/seed presence forbidden in day-pulse.service (loop-psychology)");
}
if (fails.length) {
  console.error("[verify:day-pulse-live-only] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:day-pulse-live-only] PASS (schema const live · service g4Merge false · PRESENCE_LIVE default off)",
);
