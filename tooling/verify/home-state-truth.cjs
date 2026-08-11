/**
 * verify:home-state-truth — Engine v7.23 R1 HomeReadModelV1
 * schema + Nest mapper path + SDK + server-derived todayPossible/ledgerTotal COUNT
 * App/React/CSS 변경 0 (UI R1 later) · domain FSM separate
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

const requiredFiles = [
  "schemas/home-read-model.v1.json",
  "services/market-intelligence/src/home-read-model.cjs",
  "services/api-nest/src/home-read/home-read.service.ts",
  "services/api-nest/src/home-read/home-read.user.controller.ts",
  "services/api-nest/src/home-read/home-read.user.routes.ts",
  "services/api-nest/src/home-read/home-read.module.ts",
  "services/api-nest/src/home-read/home-read.mi.ts",
  "packages/sdk/src/home-read-model/types.ts",
  "packages/sdk/src/home-read-model/fetch.ts",
  "packages/sdk/src/home-read-model/index.ts",
];
for (const f of requiredFiles) mustExist(f);

if (fails.length) {
  console.error("[verify:home-state-truth] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const schema = JSON.parse(read("schemas/home-read-model.v1.json") || "{}");
const req = schema.required || [];
for (const key of [
  "viewState",
  "session",
  "money",
  "opportunity",
  "growth",
  "ledgerTotal",
  "todayPossibleProfitUsdt",
  "provenance",
  "domainFsm",
]) {
  if (!req.includes(key)) fails.push(`schema must require ${key}`);
}
if (schema.additionalProperties !== false) {
  fails.push("schema additionalProperties must be false");
}
const viewEnum = schema.properties?.viewState?.enum || [];
for (const s of [
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
]) {
  if (!viewEnum.includes(s)) fails.push(`viewState enum missing ${s}`);
}
if (viewEnum.includes("loading")) {
  fails.push("server schema must Exclude loading (client-only)");
}
if (
  schema.properties?.opportunity?.properties?.provenance?.properties
    ?.todayPossibleProfitUsdt?.properties?.provenance?.const !== "server_derived"
) {
  fails.push("opportunity.todayPossible must const server_derived");
}

const manifest = read("schemas/manifest.day1.json");
if (!manifest.includes("home-read-model.v1.json")) {
  fails.push("manifest.day1 must list home-read-model.v1.json");
}

const mi = require(path.join(
  root,
  "services/market-intelligence/src/home-read-model.cjs",
));

// server derivation: compareReady=false must NOT count
const sum = mi.deriveTodayPossibleProfitUsdt([
  {
    bucket: "affordable",
    status: "available",
    compareReady: true,
    expectedProfitUsdt: "1.25",
  },
  {
    bucket: "affordable",
    status: "available",
    compareReady: false,
    expectedProfitUsdt: "9.00",
  },
  {
    bucket: "affordable",
    status: "paused",
    compareReady: true,
    expectedProfitUsdt: "4.00",
  },
  {
    bucket: "nearMiss",
    status: "available",
    compareReady: true,
    expectedProfitUsdt: "3.00",
  },
]);
if (sum !== "1.25") {
  fails.push(`deriveTodayPossible want 1.25 got ${sum}`);
}

const ready = mi.mapHomeReadModelV1({
  sessionStatus: "authenticated",
  money: {
    principalUsdt: "100",
    settlementCompletedTodayCount: 7,
    state: "ready_data",
    asOf: {
      principalUsdt: "2026-08-12T00:00:00.000Z",
      settlementCompletedTodayCount: "2026-08-12T00:00:00.000Z",
    },
    source: {
      principalUsdt: "ledger_projection",
      settlementCompletedTodayCount: "settlement_projection",
    },
  },
  opportunityItems: [
    {
      bucket: "affordable",
      status: "available",
      compareReady: true,
      expectedProfitUsdt: "2.50",
    },
  ],
  opportunityMeta: { affordableCount: 1, nearMissCount: 0, lockedHighCount: 0 },
  growth: {
    tickerMode: "live",
    counterMode: "ledger",
    ledgerTotal: 99,
    asOf: "2026-08-12T00:00:00.000Z",
  },
});
if (ready.viewState !== "ready_data") {
  fails.push(`authenticated ready want ready_data got ${ready.viewState}`);
}
if (Number(ready.todayPossibleProfitUsdt) !== 2.5) {
  fails.push(
    `todayPossibleProfitUsdt must be server-derived 2.5 got ${ready.todayPossibleProfitUsdt}`,
  );
}
if (ready.ledgerTotal !== 7) {
  fails.push(
    `ledgerTotal must equal Money settlement COUNT (7) not growth raw (99) got ${ready.ledgerTotal}`,
  );
}
if (
  ready.provenance?.todayPossibleProfitUsdt?.provenance !== "server_derived" ||
  ready.provenance?.todayPossibleProfitUsdt?.derivationId !==
    mi.TODAY_POSSIBLE_DERIVATION_ID
) {
  fails.push("todayPossible provenance tag missing");
}
if (ready.domainFsm !== null) {
  fails.push("Home aggregate domainFsm must be null (FSM separate)");
}

const empty = mi.mapHomeReadModelV1({
  sessionStatus: "authenticated",
  money: {
    principalUsdt: "0",
    settlementCompletedTodayCount: 0,
    state: "ready_empty",
    asOf: {},
    source: {},
  },
  opportunityItems: [],
  opportunityMeta: { affordableCount: 0 },
  growth: { tickerMode: "off", counterMode: "off", ledgerTotal: 0 },
});
if (empty.viewState !== "ready_empty") {
  fails.push(`empty home want ready_empty got ${empty.viewState}`);
}
if (empty.todayPossibleProfitUsdt !== "0") {
  fails.push("empty affordable sum must be 0 string (authenticated Fact)");
}

// Nest wiring
const routes = read("services/api-nest/src/home-read/home-read.user.routes.ts");
if (!routes.includes('get: "me/home-read"')) {
  fails.push('HOME_READ_USER_ROUTES.get must be "me/home-read"');
}
const ctl = read(
  "services/api-nest/src/home-read/home-read.user.controller.ts",
);
if (!ctl.includes("JwtAuthGuard") || !/@UseGuards\(JwtAuthGuard\)/.test(ctl)) {
  fails.push("HomeReadUserController must use JwtAuthGuard");
}
if (ctl.includes('@Query("userId")') || ctl.includes("query.userId")) {
  fails.push("controller must not trust query userId");
}
const svc = read("services/api-nest/src/home-read/home-read.service.ts");
for (const needle of [
  "HomeMoneyReadService",
  "OpportunitiesUserService",
  "GrowthPublicService",
  "mapHomeReadModelV1",
  "listFeed",
]) {
  if (!svc.includes(needle)) fails.push(`home-read.service missing ${needle}`);
}
for (const needle of ["INSERT INTO", "UPDATE public.", "CREATE TABLE"]) {
  if (svc.includes(needle) || ctl.includes(needle)) {
    fails.push(`home-read must not mutate DB: ${needle}`);
  }
}
const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("HomeReadModule")) {
  fails.push("AppModule must import HomeReadModule");
}
const nestMod = read("services/api-nest/src/home-read/home-read.module.ts");
if (
  !nestMod.includes("WalletModule") ||
  !nestMod.includes("OpportunitiesModule") ||
  !nestMod.includes("GrowthModule")
) {
  fails.push("HomeReadModule must import Wallet+Opportunities+Growth");
}

// SDK
const sdkPkg = read("packages/sdk/package.json");
if (!sdkPkg.includes('"./home-read-model"')) {
  fails.push("sdk package.json must export ./home-read-model");
}
const sdkFetch = read("packages/sdk/src/home-read-model/fetch.ts");
if (!sdkFetch.includes("/api/v1/me/home-read")) {
  fails.push("SDK must call /api/v1/me/home-read");
}
if (!sdkFetch.includes("unauthorizedDto") && !sdkFetch.includes("unauthorized")) {
  fails.push("SDK must map 401 → unauthorized");
}

// index export
const indexCjs = read("services/market-intelligence/src/index.cjs");
if (!indexCjs.includes("home-read-model")) {
  fails.push("market-intelligence index must export home-read-model");
}

// registration
const pkg = read("package.json");
if (!pkg.includes('"verify:home-state-truth"')) {
  fails.push("package.json missing verify:home-state-truth");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("home-state-truth")) {
  fails.push("CATALOG.md missing home-state-truth");
}
const stubs = read("tooling/verify/stubs/run-all.cjs");
if (!stubs.includes("home-state-truth.cjs")) {
  fails.push("stubs/run-all.cjs must include home-state-truth.cjs");
}

// App/React/CSS 변경 0 — this todo must not rewrite HomeExperience/CSS
const homeClient = read("apps/web/app/HomePageClient.tsx");
if (!homeClient.includes("HomeExperience")) {
  fails.push("HomePageClient HomeExperience must remain (React rewrite 0)");
}

if (fails.length) {
  console.error("[verify:home-state-truth] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:home-state-truth] PASS (HomeReadModelV1 · server todayPossible · ledger COUNT · viewState)",
);
