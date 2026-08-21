/**
 * verify:earnings-embed — REL-111
 * /trades earnings = wallet.profitUsdt only. client sum 0. KRW 0. missing≠0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const files = [
  "apps/web/app/trades/TradesClient.tsx",
  "apps/web/app/trades/EarningsEmbed.tsx",
  "tooling/e2e/specs/trades-closure.spec.cjs",
  "tooling/e2e/lib/consumer-route-stubs.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const client = read("apps/web/app/trades/TradesClient.tsx");
const embed = read("apps/web/app/trades/EarningsEmbed.tsx");
const spec = read("tooling/e2e/specs/trades-closure.spec.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!client.includes("EarningsEmbed") || !client.includes("fetchWalletBuckets")) {
  fail("TradesClient must mount EarningsEmbed from wallet buckets");
}
if (/reduce\(|\.reduce\(/.test(client) || /reduce\(|\.reduce\(/.test(embed)) {
  fail("earnings embed must not sum list/journal amounts");
}
if (client.includes("Math.random") || embed.includes("Math.random")) {
  fail("earnings embed must not invent money");
}
if (!embed.includes('data-earnings-embed="true"')) {
  fail("EarningsEmbed must expose data-earnings-embed");
}
if (!embed.includes('data-earnings-owner="wallet.profitUsdt"')) {
  fail("earnings owner must be wallet.profitUsdt");
}
if (!embed.includes("확인할 수 없음")) {
  fail("missing earnings must be UNAVAILABLE copy");
}
if (/fxRate|fetchFx|toFixed\(/.test(embed)) {
  fail("earnings embed must not invent FX or local money math");
}
if (/"원"|'원'|`원`/.test(embed) || /KRW/.test(embed.replace(/\/\*[\s\S]*?\*\//g, ""))) {
  fail("earnings embed must not show KRW without FX owner");
}
if (/profitUsdt\s*\?\?\s*["']0["']|["'`]0 USDT["'`]/.test(embed)) {
  fail("earnings embed must not fill missing money with 0");
}

if (!stubs.includes("earnings_mismatch") || !stubs.includes('"4.00"')) {
  fail("stub must offer earnings_mismatch with wallet profit ≠ settled sum");
}
if (!spec.includes("earnings_mismatch") || !spec.includes("4.00 USDT")) {
  fail("committed spec must prove embed uses wallet profit, not list sum");
}
if (!spec.includes("12.50 USDT")) {
  fail("mismatch spec must keep settled list amount distinct from embed");
}

if (pkg && !pkg.includes('"verify:earnings-embed"')) {
  fail("package.json missing verify:earnings-embed");
}
if (catalog && !catalog.includes("earnings-embed")) {
  fail("CATALOG.md must list earnings-embed");
}
if (domain && !domain.includes("earnings-embed.cjs")) {
  fail("domain-by-path must trigger earnings-embed");
}

if (fails.length) {
  console.error("[verify:earnings-embed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:earnings-embed] PASS — owner=wallet.profitUsdt · no client sum · KRW 0",
);
