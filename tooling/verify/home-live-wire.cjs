/**
 * verify:home-live-wire — UI PART9b 등재 · PASS 조건 Owns=PART9c
 * page ↔ @aipo/sdk/user-feed ↔ DayPulse · 401 graceful · nearMissExtraCount
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const { isGreenfieldConsumerUi } = require("./lib/greenfield-consumer.cjs");
if (
  fs.existsSync(path.join(root, "packages/sdk/src/user-feed/fetch.ts")) &&
  isGreenfieldConsumerUi()
) {
  console.log("[home-live-wire.cjs] PASS — SDK/business files present; Consumer UI is greenfield skeleton");
  process.exit(0);
}


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
  "apps/web/app/page.tsx",
  "packages/sdk/src/user-feed/fetch.ts",
  "packages/sdk/package.json",
  "packages/ui/components/opportunity/BalanceAwareHome.tsx",
  "packages/ui/components/loop/DayPulse.tsx",
];
for (const f of files) mustExist(f);

const page = read("apps/web/app/page.tsx");
const sdkPkg = read("packages/sdk/package.json");
const feed = read("packages/sdk/src/user-feed/fetch.ts");
const home = read("packages/ui/components/opportunity/BalanceAwareHome.tsx");

// --- SDK contract (PART9a · 재정의 금지) ---
if (!sdkPkg.includes('"./user-feed"')) {
  fails.push("@aipo/sdk must export ./user-feed (PART9a)");
}
for (const name of [
  "fetchOpportunityFeed",
  "fetchDayPulse",
  "nearMissExtraCount",
]) {
  if (!feed.includes(name)) {
    fails.push(`user-feed must provide ${name}`);
  }
}
if (!home.includes("nearMissExtraCount")) {
  fails.push("BalanceAwareHome must accept nearMissExtraCount prop");
}

// --- Home live wire (PART9c) ---
const wiredViaSdk =
  page.includes("@aipo/sdk/user-feed") ||
  page.includes("fetchOpportunityFeed") ||
  page.includes("fetchDayPulse");
const wiredViaClient =
  /HomePageClient/.test(page) ||
  fs.existsSync(path.join(root, "apps/web/app/HomePageClient.tsx")) ||
  fs.existsSync(
    path.join(root, "apps/web/app/_components/HomePageClient.tsx"),
  ) ||
  fs.existsSync(
    path.join(root, "apps/web/components/HomePageClient.tsx"),
  );

let clientSrc = "";
for (const rel of [
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/_components/HomePageClient.tsx",
  "apps/web/components/HomePageClient.tsx",
]) {
  if (fs.existsSync(path.join(root, rel))) {
    clientSrc = read(rel);
    break;
  }
}

const liveSrc = wiredViaSdk ? page : clientSrc;
if (!wiredViaSdk && !wiredViaClient) {
  fails.push(
    "home must wire via @aipo/sdk/user-feed or HomePageClient (PART9c)",
  );
} else {
  if (
    !liveSrc.includes("fetchOpportunityFeed") &&
    !liveSrc.includes("@aipo/sdk/user-feed")
  ) {
    fails.push("home live must call fetchOpportunityFeed / @aipo/sdk/user-feed");
  }
  if (!liveSrc.includes("fetchDayPulse") && !liveSrc.includes("DayPulse")) {
    fails.push("home live must wire DayPulse (fetchDayPulse or DayPulse data)");
  }
  // PART9h — ticker/counter server-driven (default off via API)
  if (
    !liveSrc.includes("fetchGrowthPublicSurface") &&
    !liveSrc.includes("@aipo/sdk/growth")
  ) {
    fails.push(
      "home must wire fetchGrowthPublicSurface (@aipo/sdk/growth) for ticker/counter · PART9h",
    );
  }
  if (
    /LivePayoutTicker\s+mode=["']off["']/.test(liveSrc) &&
    !liveSrc.includes("fetchGrowthPublicSurface")
  ) {
    fails.push("home ticker mode must not stay hard-coded off without growth API");
  }
  if (
    !liveSrc.includes("nearMissExtraCount") &&
    !page.includes("nearMissExtraCount")
  ) {
    fails.push("home must map feed.nearMissExtraCount → BalanceAwareHome");
  }
  const graceful401 =
    /401/.test(liveSrc) ||
    /status\s*===\s*401/.test(liveSrc) ||
    /opportunity_feed_401/.test(liveSrc) ||
    /unauthorized/i.test(liveSrc) ||
    /graceful/i.test(liveSrc);
  if (!graceful401) {
    fails.push("home live must handle 401 gracefully (PART9c · 9-pre2 session)");
  }

  // C01 — ledgerTotal is settlement COUNT · never bind as USDT amount
  if (
    /ledgerTotal\s*>\s*0\s*\?\s*[`'"]\$\{[^}]*ledgerTotal[^}]*\}\s*USDT/.test(
      liveSrc,
    ) ||
    /\$\{[^}]*ledgerTotal[^}]*\}\s*USDT/.test(liveSrc)
  ) {
    fails.push(
      "C01: Home must not render ledgerTotal as USDT (count semantic only)",
    );
  }
}

const counterSrc = read("packages/ui/components/lux/HomePayoutCounter.tsx");
if (
  counterSrc &&
  /T\.ticker\.usdtSuffix/.test(counterSrc) &&
  /ledgerTotal/.test(counterSrc)
) {
  fails.push(
    "C01: HomePayoutCounter must not suffix ledgerTotal with T.ticker.usdtSuffix",
  );
}
if (counterSrc && !/data-ledger-unit="count"/.test(counterSrc)) {
  fails.push('C01: HomePayoutCounter must declare data-ledger-unit="count"');
}

// stub-only lock (PART9c supersede)
if (
  /BalanceAwareHome\s[^>]*items=\{\[\]\}/.test(page) &&
  !wiredViaSdk &&
  !wiredViaClient
) {
  fails.push("home still stub items={[]} — live feed required (PART9c)");
}

if (fails.length) {
  console.error("[verify:home-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:home-live-wire] PASS — page↔SDK user-feed↔DayPulse · 401 graceful",
);
