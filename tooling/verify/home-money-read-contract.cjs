/**
 * verify:home-money-read-contract — Money v7.23 R1
 * schemas/home-money-read.v1.json + GET /api/v1/me/home-money-read
 * Reuse wallet buckets + DayPulse settlement COUNT · Engine todayPossible 0
 * FORBIDDEN: availableUsdt · unitless todayPossible · mutation/DDL rewrite
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

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
  "schemas/home-money-read.v1.json",
  "services/api-nest/src/wallet/home-money-read.types.ts",
  "services/api-nest/src/wallet/home-money-read.map.ts",
  "services/api-nest/src/wallet/home-money-read.service.ts",
  "services/api-nest/src/wallet/home-money-read.user.controller.ts",
  "services/api-nest/src/wallet/home-money-read.user.routes.ts",
  "packages/sdk/src/home-money-read/types.ts",
  "packages/sdk/src/home-money-read/fetch.ts",
  "packages/sdk/src/home-money-read/index.ts",
];
for (const f of requiredFiles) mustExist(f);

// ── schema contract ──
const schema = JSON.parse(read("schemas/home-money-read.v1.json") || "{}");
const req = schema.required || [];
for (const key of [
  "principalUsdt",
  "settlementCompletedTodayCount",
  "asOf",
  "source",
  "state",
]) {
  if (!req.includes(key)) {
    fails.push(`home-money-read.v1 must require ${key}`);
  }
}
if (schema.additionalProperties !== false) {
  fails.push("home-money-read.v1 additionalProperties must be false");
}
if (schema.properties?.source?.properties?.principalUsdt?.const !== "ledger_projection") {
  fails.push("source.principalUsdt must const ledger_projection");
}
if (
  schema.properties?.source?.properties?.settlementCompletedTodayCount?.const !==
  "settlement_projection"
) {
  fails.push(
    "source.settlementCompletedTodayCount must const settlement_projection",
  );
}
const stateEnum = schema.properties?.state?.enum || [];
for (const s of [
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
]) {
  if (!stateEnum.includes(s)) {
    fails.push(`state enum missing ${s}`);
  }
}
if (stateEnum.includes("loading")) {
  fails.push("state must Exclude loading (client-only)");
}

const forbiddenSchemaKeys = [
  "availableUsdt",
  "todayPossible",
  "todayPossibleProfitUsdt",
  "profitUsdt",
  "lockedUsdt",
  "ledgerTotal",
];
const props = schema.properties || {};
for (const key of forbiddenSchemaKeys) {
  if (Object.prototype.hasOwnProperty.call(props, key)) {
    fails.push(`schema must NOT define forbidden key: ${key}`);
  }
}
if (props.settlementCompletedTodayCount?.type !== "integer") {
  fails.push("settlementCompletedTodayCount must be integer COUNT (not USDT)");
}

const manifest = read("schemas/manifest.day1.json");
if (!manifest.includes("home-money-read.v1.json")) {
  fails.push("manifest.day1 must list home-money-read.v1.json");
}

// ── Nest wiring · reuse only ──
const ctl = read(
  "services/api-nest/src/wallet/home-money-read.user.controller.ts",
);
const svc = read("services/api-nest/src/wallet/home-money-read.service.ts");
const mapSrc = read("services/api-nest/src/wallet/home-money-read.map.ts");
const routes = read(
  "services/api-nest/src/wallet/home-money-read.user.routes.ts",
);
const mod = read("services/api-nest/src/wallet/wallet.module.ts");

if (!routes.includes('get: "me/home-money-read"')) {
  fails.push('HOME_MONEY_READ_USER_ROUTES.get must be "me/home-money-read"');
}
if (!ctl.includes("JwtAuthGuard") || !/@UseGuards\(JwtAuthGuard\)/.test(ctl)) {
  fails.push("HomeMoneyReadUserController must use JwtAuthGuard");
}
if (!ctl.includes("HOME_MONEY_READ_USER_ROUTES.get")) {
  fails.push("controller must bind HOME_MONEY_READ_USER_ROUTES.get");
}
if (!ctl.includes("sessionUserId") || ctl.includes('@Query("userId")')) {
  fails.push("controller must use session userId only (no query userId)");
}
if (!svc.includes("LedgerBucketsService") || !svc.includes("getUserBuckets")) {
  fails.push("service must reuse LedgerBucketsService.getUserBuckets");
}
if (!svc.includes("DayPulseService") || !svc.includes("getToday")) {
  fails.push("service must reuse DayPulseService.getToday for settlement COUNT");
}
if (!svc.includes("mapHomeMoneyReadV1")) {
  fails.push("service must map via mapHomeMoneyReadV1");
}
if (!mod.includes("HomeMoneyReadUserController")) {
  fails.push("WalletModule must register HomeMoneyReadUserController");
}
if (!mod.includes("HomeMoneyReadService")) {
  fails.push("WalletModule must provide HomeMoneyReadService");
}
if (!mod.includes("LoopModule")) {
  fails.push("WalletModule must import LoopModule (DayPulse reuse)");
}

for (const needle of ["INSERT INTO", "UPDATE public.", "CREATE TABLE"]) {
  if (svc.includes(needle) || ctl.includes(needle) || mapSrc.includes(needle)) {
    fails.push(`home-money-read must not contain mutation/DDL: ${needle}`);
  }
}
// Response assembly must not assign ambiguous/Engine fields (deny-list in map.ts is OK)
for (const rel of [
  "services/api-nest/src/wallet/home-money-read.user.controller.ts",
  "services/api-nest/src/wallet/home-money-read.service.ts",
  "packages/sdk/src/home-money-read/types.ts",
]) {
  const src = read(rel);
  if (/^\s*availableUsdt\s*:/m.test(src) || /["']availableUsdt["']\s*:/.test(src)) {
    fails.push(`${rel} must not expose availableUsdt`);
  }
  if (
    /^\s*todayPossible\s*:/m.test(src) ||
    /["']todayPossible["']\s*:/.test(src)
  ) {
    fails.push(`${rel} must not expose unitless todayPossible`);
  }
  if (
    /^\s*todayPossibleProfitUsdt\s*:/m.test(src) ||
    /["']todayPossibleProfitUsdt["']\s*:/.test(src)
  ) {
    fails.push(`${rel} must not own todayPossibleProfitUsdt (Engine R1)`);
  }
}
if (!mapSrc.includes("availableUsdt") || !mapSrc.includes("FORBIDDEN")) {
  fails.push("map.ts must deny-list availableUsdt (zero≠absent guard)");
}

// ── SDK ──
const sdkPkg = read("packages/sdk/package.json");
if (!sdkPkg.includes('"./home-money-read"')) {
  fails.push("packages/sdk package.json must export ./home-money-read");
}
const sdkFetch = read("packages/sdk/src/home-money-read/fetch.ts");
const sdkTypes = read("packages/sdk/src/home-money-read/types.ts");
if (!sdkFetch.includes("/api/v1/me/home-money-read")) {
  fails.push("SDK fetch must call /api/v1/me/home-money-read");
}
if (!sdkTypes.includes("settlementCompletedTodayCount")) {
  fails.push("SDK types must include settlementCompletedTodayCount");
}
if (
  sdkFetch.includes("todayPossibleProfitUsdt") ||
  sdkTypes.includes("availableUsdt")
) {
  fails.push("SDK must not expose Engine todayPossible / availableUsdt");
}

// ── package.json + CATALOG registration ──
const pkg = read("package.json");
if (!pkg.includes('"verify:home-money-read-contract"')) {
  fails.push("package.json missing verify:home-money-read-contract script");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("home-money-read-contract")) {
  fails.push("CATALOG.md must list home-money-read-contract");
}
const stubs = read("tooling/verify/stubs/run-all.cjs");
if (!stubs.includes("home-money-read-contract.cjs")) {
  fails.push("stubs/run-all.cjs must include home-money-read-contract.cjs");
}

// ── pure mapper behavior (compile-free via ts transpile? use dynamic require of .ts via node — skip)
// Instead: assert map source encodes owner/source/asOf + state exact rules
for (const needle of [
  'principalUsdt: "ledger_projection"',
  'settlementCompletedTodayCount: "settlement_projection"',
  "ready_empty",
  "ready_data",
  "FORBIDDEN",
]) {
  if (!mapSrc.includes(needle)) {
    fails.push(`home-money-read.map.ts missing: ${needle}`);
  }
}

// Runtime mapper smoke via compiled dist if present; else inline minimal checks
async function mapperSmoke() {
  const mapJs = path.join(
    root,
    "services/api-nest/dist/wallet/home-money-read.map.js",
  );
  if (!fs.existsSync(mapJs)) {
    // source-level assertions above; optional runtime when dist exists
    return;
  }
  const modUrl = pathToFileURL(mapJs).href;
  const { mapHomeMoneyReadV1 } = await import(modUrl);
  const empty = mapHomeMoneyReadV1({
    principalUsdt: "0",
    settlementCompletedTodayCount: 0,
    asOfPrincipalIso: "2026-08-11T00:00:00.000Z",
    asOfSettlementIso: "2026-08-11T00:00:00.000Z",
  });
  if (empty.state !== "ready_empty") {
    fails.push(`mapper: principal 0 → ready_empty (got ${empty.state})`);
  }
  if (empty.source.principalUsdt !== "ledger_projection") {
    fails.push("mapper: source.principalUsdt mismatch");
  }
  const data = mapHomeMoneyReadV1({
    principalUsdt: "10.5",
    settlementCompletedTodayCount: 3,
    asOfPrincipalIso: "2026-08-11T00:00:00.000Z",
    asOfSettlementIso: "2026-08-11T00:00:00.000Z",
  });
  if (data.state !== "ready_data") {
    fails.push(`mapper: principal>0 → ready_data (got ${data.state})`);
  }
  if (data.settlementCompletedTodayCount !== 3) {
    fails.push("mapper: COUNT must pass through as integer");
  }
  try {
    mapHomeMoneyReadV1({
      principalUsdt: "1",
      settlementCompletedTodayCount: 0,
      asOfPrincipalIso: "2026-08-11T00:00:00.000Z",
      asOfSettlementIso: "2026-08-11T00:00:00.000Z",
      // inject forbidden via Object.assign after map — tested in assert helper
    });
    const dirty = {
      ...data,
      availableUsdt: "1",
    };
    const { assertHomeMoneyReadForbiddenKeys } = await import(modUrl);
    try {
      assertHomeMoneyReadForbiddenKeys(dirty);
      fails.push("assertHomeMoneyReadForbiddenKeys must reject availableUsdt");
    } catch {
      /* expected */
    }
  } catch (e) {
    fails.push(`mapper smoke error: ${e && e.message ? e.message : e}`);
  }
}

mapperSmoke()
  .then(() => {
    if (fails.length) {
      console.error(
        "[verify:home-money-read-contract] FAIL\n- " + fails.join("\n- "),
      );
      process.exit(1);
    }
    console.log(
      "[verify:home-money-read-contract] PASS — schema+GET /me/home-money-read+SDK+source/asOf/state · Engine todayPossible 0",
    );
  })
  .catch((e) => {
    fails.push(`mapperSmoke: ${e && e.message ? e.message : e}`);
    console.error(
      "[verify:home-money-read-contract] FAIL\n- " + fails.join("\n- "),
    );
    process.exit(1);
  });
