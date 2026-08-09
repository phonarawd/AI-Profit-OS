/**
 * verify:ticker-pii-0 — UI §33.2a · Admin §35.4 pointer
 * PublicTickerEvent fields only · no email/userId/kind · DayPulse merge 0
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
// Props type must not include kind/email as render fields
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

const copy = read("packages/ui/copy/ko/ticker.ts");
for (const k of ["justSettled", "justReflected", "participantAmt", "forbiddenPhrases"]) {
  if (!copy.includes(k)) fails.push(`T.ticker missing ${k}`);
}

const home = read("apps/web/app/page.tsx");
if (!home.includes("LivePayoutTicker")) {
  fails.push("home must mount LivePayoutTicker [A]");
}
if (home.includes("DayPulse")) {
  fails.push("home must not merge DayPulse into ticker slot");
}

const wire = read("packages/ui/canon/surfaces/public-ticker.wire.json");
if (!wire.includes("day_pulse_merge")) {
  fails.push("public-ticker.wire must forbid day_pulse_merge");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (!idx.includes("ticker")) fails.push("copy/ko index must export ticker");

if (fails.length) {
  console.error("[verify:ticker-pii-0] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:ticker-pii-0] PASS (PublicTicker PII0 · CountUp ledger-only · DayPulse merge0)",
);
