/**
 * verify:ticker-pii-0 - UI SS33.2a - Admin SS35.4 pointer
 * PublicTickerEvent fields only. No email/userId/kind. DayPulse merge 0.
 *
 * RETIRED 2026-09-04 (Owner decision, governance/runtime-surfaces.v1.json
 * surfaces.home.retiredFeatures): "home must mount LivePayoutTicker /
 * HomePayoutCounter" is dropped. Spark Dash Home intentionally has no live
 * settlement ticker or cumulative payout counter; do not reintroduce.
 * Previously enforced via fs.existsSync(HomePageClient.tsx) fallback, the
 * forbidden pattern tooling/verify/live-surface-integrity.cjs now scans for.
 *
 * The PII schema/component-level checks below are independent of Home
 * mounting and remain in force.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const schemaPath = path.join(root, "schemas/public-ticker-event.v1.json");
if (!fs.existsSync(schemaPath)) {
  fails.push("missing schemas/public-ticker-event.v1.json");
} else {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const props = Object.keys(schema.properties || {});
  for (const need of ["id", "displayLabel", "amountKrwText", "templateKey", "at"]) {
    if (!props.includes(need)) fails.push(`schema missing property ${need}`);
  }
  for (const ban of ["email", "userId", "legalName", "kind", "displayName"]) {
    if (props.includes(ban)) fails.push(`schema must not expose ${ban}`);
  }
}

const tickerComp = read("packages/ui/components/lux/LivePayoutTicker.tsx");
for (const needle of [
  "LivePayoutTicker",
  "displayLabel",
  'data-day-pulse-merge="false"',
  'data-testid="live-payout-ticker"',
  "PublicTickerEvent",
]) {
  if (!tickerComp.includes(needle)) {
    fails.push(`LivePayoutTicker missing ${needle}`);
  }
}
if (/export type PublicTickerEvent[\s\S]*?\n};/.test(tickerComp)) {
  const m = tickerComp.match(/export type PublicTickerEvent = \{([\s\S]*?)\};/);
  if (m) {
    const body = m[1];
    for (const ban of ["email", "userId", "legalName", "kind"]) {
      if (new RegExp(`\\b${ban}\\b`).test(body)) {
        fails.push(`PublicTickerEvent must not include ${ban}`);
      }
    }
  }
}

const countUp = read("packages/ui/components/lux/CountUpNumber.tsx");
if (!countUp.includes('source: "settlement.completed"')) {
  fails.push("CountUpNumber must require source settlement.completed");
}
if (!countUp.includes("data-countup-source")) {
  fails.push("CountUpNumber missing data-countup-source");
}

const counter = read("packages/ui/components/lux/HomePayoutCounter.tsx");
for (const needle of [
  "HomePayoutCounter",
  'data-testid="home-payout-counter"',
  'data-day-pulse-merge="false"',
  "counter_mode",
  "settlement.completed",
]) {
  if (!counter.includes(needle)) {
    fails.push(`HomePayoutCounter missing ${needle}`);
  }
}

const copy = read("packages/ui/copy/ko/ticker.ts");
for (const k of ["justSettled", "justReflected", "participantAmt", "forbiddenPhrases"]) {
  if (!copy.includes(k)) fails.push(`T.ticker missing ${k}`);
}

const wire = read("packages/ui/canon/surfaces/public-ticker.wire.json");
if (!wire.includes("day_pulse_merge")) {
  fails.push("public-ticker.wire must forbid day_pulse_merge");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (!idx.includes("ticker")) fails.push("copy/ko index must export ticker");

// --- Home mounting requirement: RETIRED 2026-09-04 (see file header) ---
let registry;
try {
  registry = JSON.parse(read("governance/runtime-surfaces.v1.json") || "{}");
} catch {
  registry = { surfaces: {} };
}
const homeClientRel = registry.surfaces?.home?.client || "apps/web/app/HomeDesktopClient.tsx";
const homePresentation = registry.surfaces?.home?.presentation || [];
const liveHomeSrc =
  read(homeClientRel) + homePresentation.map((p) => read(p)).join("\n");
if (/LivePayoutTicker|HomePayoutCounter/.test(liveHomeSrc)) {
  fails.push(
    "RETIRED FEATURE REINTRODUCED: LivePayoutTicker/HomePayoutCounter must not be mounted " +
      "in live Home (governance/runtime-surfaces.v1.json surfaces.home.retiredFeatures - Owner " +
      "decision 2026-09-04). If this is an intentional product change, update the registry first.",
  );
}

if (fails.length) {
  console.error("[verify:ticker-pii-0] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:ticker-pii-0] PASS (PublicTicker PII 0, CountUp ledger-only, retired-from-Home guard)",
);
