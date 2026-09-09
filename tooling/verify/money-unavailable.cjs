/**
 * verify:money-unavailable - REL-007
 * missing money must never become 0. Home geometry must not change (this
 * verify is content-only).
 *
 * REWRITTEN 2026-09-04 (verify migration session): this file was MIXED - it
 * already checked the live apps/web/components/spark-dash-home/format.ts
 * correctly, but also hard-required the dead
 * apps/web/lib/opportunity-card-map.ts and packages/ui/components/opportunity/
 * OpportunityCard.tsx(old)/money-display.ts, and read HomeDesktop.tsx/
 * HomeMobile.tsx without ever asserting anything about them (`void`-discarded).
 * Dead assertions removed; the live read is upgraded into a real check; the
 * card-language check is repointed to the live
 * apps/web/components/spark-dash-profits/* card.
 */
const fs = require("fs");
const path = require("path");

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

// --- live formatter contract (apps/web/components/spark-dash-home/format.ts) ---
const formatSrc = read("apps/web/components/spark-dash-home/format.ts");
if (!formatSrc.includes('if (raw == null || raw === "") return null;')) {
  fails.push("formatUsdtDisplay must return null for missing");
}
if (!formatSrc.includes("UNAVAILABLE")) {
  fails.push("format.ts must declare UNAVAILABLE state");
}
if (!formatSrc.includes("moneyOrDash")) {
  fails.push("format.ts must export moneyOrDash (missing -> dash, not 0)");
}

// --- live Home surfaces must render money via the shared formatter, not ad-hoc fallback-to-0 ---
const homeDesktop = read("apps/web/components/spark-dash-home/HomeDesktop.tsx");
const homeMobile = read("apps/web/components/spark-dash-home/HomeMobile.tsx");
for (const [name, src] of [
  ["HomeDesktop.tsx", homeDesktop],
  ["HomeMobile.tsx", homeMobile],
]) {
  if (!src.includes('from "./format"')) {
    fails.push(`${name} must render money via ./format (moneyOrDash/splitUsdtParts), not ad-hoc formatting`);
  }
  if (/\?\?\s*"0"|\|\|\s*"0"(?!\d)/.test(src)) {
    fails.push(`${name} must not fallback missing money to the string "0"`);
  }
}

// --- live opportunity card (spark-dash-profits) must show UNAVAILABLE, not 0, for missing money ---
const liveCard = read("apps/web/components/spark-dash-profits/OpportunityCard.tsx");
const liveMetrics = read("apps/web/components/spark-dash-profits/OpportunityMetrics.tsx");
if (!liveCard.includes("OpportunityMetrics")) {
  fails.push("live OpportunityCard must render OpportunityMetrics (money fields)");
}
if (/\?\?\s*"0"|\|\|\s*"0"(?!\d)/.test(liveMetrics)) {
  fails.push("live OpportunityMetrics must not fallback missing money to the string \"0\"");
}

// --- pure function contract (owner-agnostic, reused by e2e) ---
const {
  moneyDisplayState,
} = require(path.join(root, "tooling/e2e/lib/money-unavailable.cjs"));
if (moneyDisplayState(null).state !== "UNAVAILABLE") {
  fails.push("runtime missing money must be UNAVAILABLE");
}
if (moneyDisplayState(null).display === "0") {
  fails.push("runtime missing money must not display 0");
}
if (moneyDisplayState("0").state !== "ready") {
  fails.push("real zero must remain ready");
}

const spec = read("tooling/e2e/specs/money-unavailable.spec.cjs");
if (!spec.includes("UNAVAILABLE") || !spec.includes("moneyDisplayState")) {
  fails.push("REL-006 spec must include money-unavailable case");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:money-unavailable"')) {
  fails.push("package.json missing verify:money-unavailable");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("money-unavailable")) {
  fails.push("CATALOG.md must list money-unavailable");
}

// --- consumer money display must not leak IT jargon (live card + formatter only) ---
const jargon = `${liveCard}\n${liveMetrics}\n${formatSrc}`;
if (/\bAPI\b|\bStaging\b|\bDLQ\b|\bNATS\b|\bMock\b/.test(jargon)) {
  fails.push("consumer money display must not add IT jargon");
}

if (fails.length) {
  console.error("[verify:money-unavailable] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:money-unavailable] PASS (live Home + live OpportunityCard: missing != 0, UNAVAILABLE/dash only)",
);
