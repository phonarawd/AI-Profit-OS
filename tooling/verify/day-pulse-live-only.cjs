/**
 * verify:day-pulse-live-only — UI §51.24.1
 * DayPulse = ledger/settlement live only · G4 demo/hybrid/blended merge 0
 * Admin DayPulse 수동 편집 UI 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
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
  "packages/ui/copy/ko/loop.ts",
  "packages/ui/canon/surfaces/day-pulse.wire.json",
  "packages/ui/components/loop/DayPulse.tsx",
  "packages/ui/components/loop/index.ts",
  "services/api-nest/src/loop/day-pulse.service.ts",
  "services/api-nest/src/loop/day-pulse.user.controller.ts",
  "apps/web/app/page.tsx",
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

const ui = read("packages/ui/components/loop/DayPulse.tsx");
for (const needle of [
  'data-testid="day-pulse"',
  'data-canon="day-pulse"',
  'data-source="live"',
  'data-g4-merge="false"',
  'data-admin-edit="false"',
  "T.loop",
  "platformSafeStopToday",
]) {
  if (ui && !ui.includes(needle)) fails.push(`DayPulse missing: ${needle}`);
}
if (/counter_mode|ticker_mode|blended|demoTotal/i.test(ui)) {
  fails.push("DayPulse must not display G4 counter/ticker modes");
}

/**
 * PART9c — DayPulse may live in HomePageClient (page.tsx thin entry) 또는
 * HomeExperience(ADR-017 v1.3, presentation layer 간접 mount) 경유
 */
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
home = `${home}\n${read("packages/ui/components/home/HomeExperience.tsx")}`;
if (home && !home.includes("DayPulse")) {
  fails.push("home must mount DayPulse [A2]");
}
if (home && !home.includes('data-home-slot="day-pulse"')) {
  fails.push("home DayPulse must use data-home-slot=day-pulse");
}
const tickerSlot = home.match(/data-home-slot="ticker"[\s\S]*?<\/div>/);
if (tickerSlot && tickerSlot[0].includes("DayPulse")) {
  fails.push("DayPulse must not sit inside ticker slot");
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/day-pulse.wire.json") || "{}",
);
if (wire.id !== "day-pulse") fails.push("day-pulse.wire id mismatch");
for (const f of [
  "g4_demo_merge",
  "g4_hybrid_merge",
  "counter_mode_blended",
  "admin_manual_edit",
  "ticker_slot_merge",
]) {
  if (!(wire.forbidden || []).includes(f)) {
    fails.push(`day-pulse.wire must forbid ${f}`);
  }
}

// Admin DayPulse 편집 UI 0 (L18)
const adminRoot = path.join(root, "apps/admin");
if (fs.existsSync(adminRoot)) {
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        if (name === "node_modules" || name === ".next" || name === ".open-next")
          continue;
        walk(p);
      } else if (/\.(tsx?|jsx?)$/.test(name)) {
        const t = fs.readFileSync(p, "utf8");
        if (
          /DayPulse|day-pulse|dayPulse|platformSafeStopToday/.test(t) &&
          /(edit|Input|onChange|setPulse|manual)/i.test(t)
        ) {
          fails.push(
            `Admin DayPulse edit UI forbidden: ${path.relative(root, p)}`,
          );
        }
      }
    }
  };
  walk(adminRoot);
}

const copy = read("packages/ui/copy/ko/loop.ts");
if (copy && !copy.includes("mayStop:")) {
  fails.push("loop.ts must define mayStop (shared §51.24)");
}
if (copy && !copy.includes("safeStopToday:")) {
  fails.push("loop.ts missing safeStopToday");
}

if (fails.length) {
  console.error("[verify:day-pulse-live-only] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:day-pulse-live-only] PASS (live API · G4 merge0 · Admin edit0)",
);
