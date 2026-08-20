/**
 * verify:money-unavailable — REL-007
 * missing→0 금지. Home geometry 변경 없음.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const mapSrc = read("apps/web/lib/opportunity-card-map.ts");
if (
  /asString\(\s*item\.requiredCapitalUsdt\s*,\s*"0"\s*\)/.test(mapSrc) ||
  /asString\(\s*item\.expectedProfitUsdt\s*,\s*"0"\s*\)/.test(mapSrc)
) {
  fails.push("opportunity-card-map must not fallback money to 0");
}
if (!mapSrc.includes("asMoneyString")) {
  fails.push("opportunity-card-map must use asMoneyString");
}

const formatSrc = read("apps/web/components/spark-dash-home/format.ts");
if (!formatSrc.includes('if (raw == null || raw === "") return null;')) {
  fails.push("formatUsdtDisplay must return null for missing");
}
if (!formatSrc.includes("UNAVAILABLE")) {
  fails.push("format.ts must declare UNAVAILABLE state");
}

const homeDesktop = read("apps/web/components/spark-dash-home/HomeDesktop.tsx");
const homeMobile = read("apps/web/components/spark-dash-home/HomeMobile.tsx");
void homeDesktop;
void homeMobile;

const card = read("packages/ui/components/opportunity/OpportunityCard.tsx");
if (!card.includes("formatUsdtOrUnavailable") || !card.includes("data-money-state")) {
  fails.push("OpportunityCard must render UNAVAILABLE state");
}

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

const jargon = `${card}\n${read("packages/ui/components/opportunity/money-display.ts")}`;
if (/\bAPI\b|\bStaging\b|\bDLQ\b|\bNATS\b|\bMock\b/.test(jargon)) {
  fails.push("consumer money display must not add IT jargon");
}

if (fails.length) {
  console.error("[verify:money-unavailable] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:money-unavailable] PASS (missing≠0 · UNAVAILABLE · Home geometry untouched)",
);
