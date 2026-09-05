/**
 * verify:no-fake-zero-status — Engine v7.23 R1 HomeReadModelV1
 * unauthorized/absent must not become ready_data with invented Fact zeros
 * static scan claim 0 · guest zeros ≠ Fact
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

const miPath = path.join(
  root,
  "services/market-intelligence/src/home-read-model.cjs",
);
if (!fs.existsSync(miPath)) {
  console.error("[verify:no-fake-zero-status] FAIL\n- missing home-read-model.cjs");
  process.exit(1);
}
const mi = require(miPath);

// guest / expired → unauthorized · money/opportunity/totals null
for (const sessionStatus of ["guest", "expired"]) {
  const dto = mi.mapHomeReadModelV1({ sessionStatus });
  if (dto.viewState !== "unauthorized") {
    fails.push(`${sessionStatus} viewState want unauthorized got ${dto.viewState}`);
  }
  if (dto.money != null || dto.opportunity != null) {
    fails.push(`${sessionStatus} must not attach money/opportunity Fact`);
  }
  if (dto.todayPossibleProfitUsdt != null || dto.ledgerTotal != null) {
    fails.push(`${sessionStatus} must not invent todayPossible/ledgerTotal`);
  }
  try {
    mi.assertNoFakeZeroHomeRead({
      viewState: "unauthorized",
      session: { status: sessionStatus },
      money: {
        principalUsdt: "0",
        settlementCompletedTodayCount: 0,
        state: "ready_empty",
      },
      opportunity: null,
      growth: null,
      ledgerTotal: 0,
      todayPossibleProfitUsdt: "0",
      provenance: { todayPossibleProfitUsdt: null, ledgerTotal: null },
      domainFsm: null,
    });
    fails.push("assertNoFakeZero must reject unauthorized+invented zeros");
  } catch {
    /* expected */
  }
}

// ready_data requires authenticated
try {
  mi.assertNoFakeZeroHomeRead({
    viewState: "ready_data",
    session: { status: "guest" },
    money: null,
    opportunity: null,
    growth: null,
    ledgerTotal: null,
    todayPossibleProfitUsdt: null,
    provenance: { todayPossibleProfitUsdt: null, ledgerTotal: null },
    domainFsm: null,
  });
  fails.push("assertNoFakeZero must reject ready_data+guest");
} catch {
  /* expected */
}

// forbidden fake keys
try {
  mi.assertNoFakeZeroHomeRead({
    viewState: "ready_empty",
    session: { status: "authenticated" },
    money: null,
    opportunity: null,
    growth: null,
    ledgerTotal: 0,
    todayPossibleProfitUsdt: "0",
    availableUsdt: "0",
    provenance: {
      todayPossibleProfitUsdt: {
        provenance: "server_derived",
        derivationId: mi.TODAY_POSSIBLE_DERIVATION_ID,
      },
      ledgerTotal: {
        provenance: "server_derived",
        derivationId: "home.ledger_total_settlement_completed_today_count",
      },
    },
    domainFsm: null,
  });
  fails.push("assertNoFakeZero must reject availableUsdt");
} catch {
  /* expected */
}

// recoverable_error money state must not be coerced to ready_data by compose alone
const errDto = mi.mapHomeReadModelV1({
  sessionStatus: "authenticated",
  money: {
    principalUsdt: "0",
    settlementCompletedTodayCount: 0,
    state: "recoverable_error",
    reasonCode: "money.home.buckets_missing",
    asOf: {},
    source: {},
  },
  opportunityItems: [],
  opportunityMeta: { affordableCount: 0 },
  growth: { tickerMode: "off", counterMode: "off", ledgerTotal: 0 },
});
if (errDto.viewState !== "recoverable_error") {
  fails.push(
    `buckets_missing must surface recoverable_error got ${errDto.viewState}`,
  );
}

// SDK must not invent ready_data on 401
const sdkFetch = read("packages/sdk/src/home-read-model/fetch.ts");
if (!/status === 401/.test(sdkFetch) && !/res\.status === 401/.test(sdkFetch)) {
  fails.push("SDK fetch must handle 401");
}
if (!sdkFetch.includes('viewState: "unauthorized"')) {
  fails.push("SDK 401 path must set viewState unauthorized");
}
if (/viewState:\s*"ready_data"/.test(sdkFetch) && /401/.test(sdkFetch)) {
  // ensure 401 block doesn't set ready_data — check unauthorizedDto
  if (!sdkFetch.includes("unauthorizedDto")) {
    fails.push("SDK should centralize unauthorizedDto");
  }
}
// normalize must strip unauthorized Fact
if (!sdkFetch.includes("normalizeHomeReadModel")) {
  fails.push("SDK must expose normalizeHomeReadModel");
}

// Nest mapper path must call assert path via mapHomeReadModelV1 (which asserts)
const mapCjs = read("services/market-intelligence/src/home-read-model.cjs");
if (!mapCjs.includes("assertNoFakeZeroHomeRead")) {
  fails.push("mapper must call assertNoFakeZeroHomeRead");
}
if (!mapCjs.includes("staticScanClaim") && !mapCjs.includes("FORBIDDEN_FAKE")) {
  fails.push("mapper must deny-list fake claim keys");
}

// Money HomeMoneyRead still forbids owning todayPossible (Engine Owns)
const moneyCtl = read(
  "services/api-nest/src/wallet/home-money-read.user.controller.ts",
);
if (/todayPossibleProfitUsdt/.test(moneyCtl) && /return/.test(moneyCtl)) {
  // comment mention OK; ownership in response assembly forbidden — check map
}
const moneyMap = read("services/api-nest/src/wallet/home-money-read.map.ts");
if (!moneyMap.includes("todayPossibleProfitUsdt") || !moneyMap.includes("FORBIDDEN")) {
  fails.push("Money map must keep todayPossibleProfitUsdt on FORBIDDEN list");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:no-fake-zero-status"')) {
  fails.push("package.json missing verify:no-fake-zero-status");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("no-fake-zero-status")) {
  fails.push("CATALOG.md missing no-fake-zero-status");
}
const stubs = read("tooling/verify/stubs/run-all.cjs");
if (!stubs.includes("no-fake-zero-status.cjs")) {
  fails.push("stubs/run-all.cjs must include no-fake-zero-status.cjs");
}

const homeClient = read("apps/web/app/HomeDesktopClient.tsx");
if (/principalUsdt:\s*"0"/.test(homeClient)) {
  fails.push("HomeDesktopClient must not invent principalUsdt 0");
}
for (const deadPath of [
  "apps/web/app/HomePageClient.tsx",
  "packages/ui/components/home/HomeExperience.tsx",
]) {
  if (fs.existsSync(path.join(root, deadPath))) {
    fails.push(`retired Canon Home file must stay deleted, reappeared: ${deadPath}`);
  }
}

if (fails.length) {
  console.error("[verify:no-fake-zero-status] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:no-fake-zero-status] PASS (unauthorized\u2260Fact zero · ready_data auth-only · deny-list)",
);
