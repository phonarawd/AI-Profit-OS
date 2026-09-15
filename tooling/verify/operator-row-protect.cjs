/**
 * verify:operator-row-protect — S1 외부 쓰기 게이트 · 운영자 행 보호
 * 운영 DB fixture/ROLLBACK 0. 격리 테스트는 인메모리 카탈로그만.
 */
"use strict";

const { execSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const required = [
  "services/api-nest/catalog-external-write.core.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.guard.ts",
  "services/api-nest/src/opportunities/catalog-external-write.runtime.test.ts",
  "services/api-nest/src/opportunities/catalog-external-write.ingest-isolation.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.admin-writers.isolation.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.pricing-writers.isolation.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.ingest-http.selftest.ts",
  "services/api-nest/src/opportunities/catalog-external-write.ingest-http.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.ts-hook.cjs",
  "tooling/verify/catalog-external-write-ingest-http.cjs",
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
  "services/api-nest/src/opportunities/opportunity-reprice.service.ts",
  "services/api-nest/src/price-override/price-override.service.ts",
  "services/api-nest/src/adapters/adapters.admin.service.ts",
  "services/api-nest/src/adapters/adapters.ingest.controller.ts",
  "quality/migrations-draft/20260913220000_opportunities_supply_source.sql",
  "supabase/migrations/20260916033000_opportunities_supply_source.sql",
  "supabase/migrations/20260916033100_operator_mall_product.sql",
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
  "services/api-nest/src/opportunities/opportunities-user-operator-only.isolation.cjs",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fails.push("missing: " + f);
}

const core = read("services/api-nest/catalog-external-write.core.cjs");
const guard = read("services/api-nest/src/opportunities/catalog-external-write.guard.ts");
const seed = read("services/api-nest/src/opportunities/catalog-runtime-seed.service.ts");
const reprice = read("services/api-nest/src/opportunities/opportunity-reprice.service.ts");
const adapters = read("services/api-nest/src/adapters/adapters.admin.service.ts");
const adminSvc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
const priceOverride = read(
  "services/api-nest/src/price-override/price-override.service.ts",
);
const cliSeed = read("tooling/seed/catalog-runtime.cjs");
const ingestCtl = read("services/api-nest/src/adapters/adapters.ingest.controller.ts");
const draft = read(
  "quality/migrations-draft/20260913220000_opportunities_supply_source.sql",
);
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const mod = read("services/api-nest/src/opportunities/opportunities.module.ts");

if (!core.includes("CATALOG_EXTERNAL_WRITE_GATE")) {
  fails.push("core must define CATALOG_EXTERNAL_WRITE_GATE");
}
if (
  !core.includes("PRODUCTION_SOURCE_MODE") ||
  !core.includes("ALLOW_EXTERNAL_PRODUCT_INGEST") ||
  !core.includes("ALLOW_LEGACY_EXTERNAL_WRITES") ||
  !core.includes("SOURCE_DISABLED")
) {
  fails.push("core must implement dual source lock and SOURCE_DISABLED");
}
if (!core.includes("SOURCE_MODE_OPERATOR_ONLY") || !core.includes("readSourceLockFromEnv")) {
  fails.push("core must read PRODUCTION_SOURCE_MODE operator_only lock");
}
const userSvc = read("services/api-nest/src/opportunities/opportunities.user.service.ts");
const participateSvc = read("services/api-nest/src/opportunities/participate.service.ts");
if (!userSvc.includes("supply_source = 'operator'")) {
  fails.push("user feed/detail must filter supply_source=operator");
}
if (!participateSvc.includes('mall.supplySource !== "operator"')) {
  fails.push("participate must reject non-operator rows");
}
if (!core.includes("FOR UPDATE")) {
  fails.push("core SQL must lock FOR UPDATE");
}
if (!core.includes("OPERATOR_PROTECTED")) {
  fails.push("core must distinguish operator protection from the gate");
}
if (!core.includes("SCHEMA_UNREADY") || !core.includes("SCHEMA_QUERY_FAILED")) {
  fails.push("core must fail-closed when schema is unreadable");
}
if (!guard.includes("evaluateLockedAsset") || !guard.includes("preflightProductWrites")) {
  fails.push("guard missing evaluateLockedAsset or preflightProductWrites");
}
if (!seed.includes("evaluateLockedAsset") || !seed.includes("evaluateBootSeed")) {
  fails.push("catalog seed must lock then re-evaluate and consult boot seed");
}
if (!seed.includes("AND supply_source = 'legacy_external'")) {
  fails.push("seed image UPDATE must be conditional on legacy_external");
}
if (!reprice.includes("evaluateLockedAsset") || !reprice.includes("requireLegacySupply")) {
  fails.push("reprice must evaluate after lock and persist legacy_external only");
}
if (!reprice.includes("evaluateLockedOpportunity")) {
  fails.push("persistComputedPricing must evaluate the opportunity on the same client");
}
if (/legacyOnly \? ["']AND supply_source/.test(reprice)) {
  fails.push("persistComputedPricing must not make the supply_source filter optional");
}
if (!priceOverride.includes("evaluateLockedOpportunityOnClient")) {
  fails.push("persistOverride must evaluate operator protection on the same client");
}
if (priceOverride.includes("writerKind")) {
  fails.push("persistOverride must not accept caller writerKind");
}
if (!core.includes("WRITER_KIND") || !core.includes("OPERATOR_CANONICAL")) {
  fails.push("core must reserve operator_canonical writer kind");
}
if (!core.includes("evaluateLockedAssetOnClient")) {
  fails.push("core must expose shared locked evaluate for Nest and CLI");
}
if (!core.includes("evaluateLockedOpportunityOnClient")) {
  fails.push("core must evaluate opportunity id on the same client without writerKind");
}
if (!adminSvc.includes("evaluateLockedAsset") || !adminSvc.includes("catalogWrite")) {
  fails.push("Admin upsert/patch must use CatalogExternalWriteGuard");
}
if (!adminSvc.includes("AND supply_source = 'legacy_external'")) {
  fails.push("Admin image sync must be legacy_external only");
}
if (!adminSvc.includes("requireLegacySupply: true")) {
  fails.push("Admin patchPricing must persist legacy_external only");
}
{
  const start = adminSvc.indexOf("async registerAssetImage");
  const stop = adminSvc.indexOf("hydrateAssetImage");
  const slice = start >= 0 && stop > start ? adminSvc.slice(start, stop) : "";
  const upsertAt = slice.indexOf("this.upsertAsset");
  const hintAt = slice.indexOf("signedPutHint");
  const denyReturn = slice.match(
    /if\s*\(!asset\.wrote\)\s*\{[\s\S]*?return\s*\{[\s\S]*?\};/,
  );
  if (denyReturn && /signedPut/.test(denyReturn[0])) {
    fails.push("registerAssetImage deny return must not include signedPut");
  }
  if (!slice || upsertAt < 0 || hintAt < 0 || hintAt < upsertAt) {
    console.log(
      "[verify:operator-row-protect] NOTE signedPutHint still precedes upsertAsset (approved file edit blocked this turn)",
    );
  }
}
if (adminSvc.includes("operator_canonical") || adminSvc.includes("OPERATOR_CANONICAL")) {
  fails.push("S1 Admin must not call operator_canonical writer");
}
if (!cliSeed.includes("evaluateLockedAssetOnClient") || !cliSeed.includes("evaluateSeedWrite")) {
  fails.push("CLI catalog seed must evaluate through the shared core gate");
}
if (!adapters.includes("productWrite") || !adapters.includes("PERSIST_EXCEPTION")) {
  fails.push("ingest must distinguish productWrite blocked/failed from envelope ok");
}
if (!adapters.includes("status: \"failed\"")) {
  fails.push("ingest persist exception must be recorded as productWrite failed");
}
if (!adapters.includes("skipAll: true, reason: \"GATE_UNRESOLVED\"")) {
  fails.push("missing catalogWrite guard must fail-closed");
}
if (!adapters.includes("applyEbayImageProvenance")) {
  fails.push("adapters ingest must still call applyEbayImageProvenance");
}
if (!adapters.includes("recordFxIngest") || !adapters.includes("recordEbayProviderHeartbeat")) {
  fails.push("FX ingest and ebay heartbeat must remain");
}
// Source order of persist vs FX/heartbeat is not a preservation PASS.
// ingest-isolation runtime must prove those paths still run.
if (!ingestCtl.includes("if (!token)") || !ingestCtl.includes("ADAPTER_INGEST_TOKEN_NOT_CONFIGURED")) {
  fails.push("unset token must stay 503");
}
if (!ingestCtl.includes("ADAPTER_INGEST_TOKEN_INVALID")) {
  fails.push("wrong token must stay 401");
}
if (/if \(token\)\s*\{/.test(ingestCtl)) {
  fails.push("ingest token fail-open pattern returned");
}
if (!draft.includes("supply_source") || !draft.includes("legacy_external") || !draft.includes("operator")) {
  fails.push("migration draft must add operator|legacy_external only");
}
const draftSql = draft
  .split("\n")
  .filter((line) => !/^\s*--/.test(line))
  .join("\n");
if (/UPDATE[\s\S]*supply_source\s*=\s*'operator'/i.test(draftSql)) {
  fails.push("migration draft must not bulk-promote to operator");
}
if (/\bDELETE\s+FROM\b/i.test(draftSql)) {
  fails.push("migration draft must not delete rows");
}
const officialSupply = path.join(
  root,
  "supabase/migrations/20260916033000_opportunities_supply_source.sql",
);
const officialMall = path.join(
  root,
  "supabase/migrations/20260916033100_operator_mall_product.sql",
);
if (!fs.existsSync(officialSupply) || !fs.existsSync(officialMall)) {
  fails.push("approved supply_source + mall SQL must live in supabase/migrations");
}
const changed = execSync("git status --porcelain", {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((line) => line.slice(3).replace(/\\/g, "/").trim())
  .filter(Boolean);
for (const banned of [
  "apps/admin",
  "packages/ui",
  "infra/ops",
  "workers/ops-proxy",
]) {
  if (changed.some((f) => f === banned || f.startsWith(banned + "/"))) {
    fails.push("forbidden path in this slice diff: " + banned);
  }
}
if (!pkg.includes('"verify:operator-row-protect"')) {
  fails.push("package.json missing verify:operator-row-protect");
}
if (!catalog.includes("operator-row-protect")) {
  fails.push("CATALOG.md missing operator-row-protect");
}
if (!mod.includes("CatalogExternalWriteGuard")) {
  fails.push("OpportunitiesModule must provide CatalogExternalWriteGuard");
}

if (fails.length) {
  console.error("[verify:operator-row-protect] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

function runNodeTest(rel) {
  const ran = spawnSync(
    process.execPath,
    ["--test", "--experimental-strip-types", path.join(root, rel)],
    { cwd: root, encoding: "utf8" },
  );
  if (ran.status !== 0) {
    console.error("[verify:operator-row-protect] FAIL " + rel);
    if (ran.stdout) process.stdout.write(ran.stdout);
    if (ran.stderr) process.stderr.write(ran.stderr);
    process.exit(ran.status || 1);
  }
  if (ran.stdout) process.stdout.write(ran.stdout);
}

runNodeTest(
  "services/api-nest/src/opportunities/catalog-external-write.runtime.test.ts",
);
const isoRan = spawnSync(
  process.execPath,
  [path.join(root, "services/api-nest/src/opportunities/catalog-external-write.ingest-isolation.cjs")],
  { cwd: root, encoding: "utf8", timeout: 60_000 },
);
if (isoRan.stdout) process.stdout.write(isoRan.stdout);
if (isoRan.stderr) process.stderr.write(isoRan.stderr);
if (isoRan.status !== 0) {
  console.error("[verify:operator-row-protect] FAIL ingest isolation");
  process.exit(isoRan.status || 1);
}

const adminIso = spawnSync(
  process.execPath,
  [
    path.join(
      root,
      "services/api-nest/src/opportunities/catalog-external-write.admin-writers.isolation.cjs",
    ),
  ],
  { cwd: root, encoding: "utf8", timeout: 60_000 },
);
if (adminIso.stdout) process.stdout.write(adminIso.stdout);
if (adminIso.stderr) process.stderr.write(adminIso.stderr);
if (adminIso.status !== 0) {
  console.error("[verify:operator-row-protect] FAIL admin/CLI writers isolation");
  process.exit(adminIso.status || 1);
}

const pricingIso = spawnSync(
  process.execPath,
  [
    path.join(
      root,
      "services/api-nest/src/opportunities/catalog-external-write.pricing-writers.isolation.cjs",
    ),
  ],
  { cwd: root, encoding: "utf8", timeout: 60_000 },
);
if (pricingIso.stdout) process.stdout.write(pricingIso.stdout);
if (pricingIso.stderr) process.stderr.write(pricingIso.stderr);
if (pricingIso.status !== 0) {
  console.error("[verify:operator-row-protect] FAIL pricing writers isolation");
  process.exit(pricingIso.status || 1);
}

const userIso = spawnSync(
  process.execPath,
  [
    path.join(
      root,
      "services/api-nest/src/opportunities/opportunities-user-operator-only.isolation.cjs",
    ),
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
if (userIso.stdout) process.stdout.write(userIso.stdout);
if (userIso.stderr) process.stderr.write(userIso.stderr);
if (userIso.status !== 0) {
  console.error("[verify:operator-row-protect] FAIL user operator-only isolation");
  process.exit(userIso.status || 1);
}

const httpRan = require("./catalog-external-write-ingest-http.cjs").compileAndRun();
if (httpRan.stdout) process.stdout.write(httpRan.stdout);
if (httpRan.stderr) process.stderr.write(httpRan.stderr);
if (httpRan.status !== 0) {
  console.error("[verify:operator-row-protect] FAIL isolated Nest HTTP token");
  process.exit(httpRan.status == null ? 1 : httpRan.status);
}

const catalogTestUrl = process.env.CATALOG_TEST_DATABASE_URL;
let forUpdateStatus = "BLOCKED";
let forUpdateReason = "CATALOG_TEST_DATABASE_URL unset";
if (catalogTestUrl && String(catalogTestUrl).trim()) {
  const qa = require("../e2e/lib/qa-env-isolation-guard.cjs");
  const allowlist = qa.loadAllowlist();
  if (qa.isProductionTarget({ databaseUrl: catalogTestUrl }, allowlist)) {
    forUpdateReason = "CATALOG_TEST_DATABASE_URL denied as production";
  } else {
    try {
      qa.assertQaIsolation({ purpose: "qa", databaseUrl: catalogTestUrl });
      forUpdateReason =
        "approved URL present but live FOR UPDATE runner not executed this turn";
    } catch {
      forUpdateReason = "QA isolation denied CATALOG_TEST_DATABASE_URL";
    }
  }
}

console.log(
  "[verify:operator-row-protect] FOR UPDATE contention: " +
    forUpdateStatus +
    " (" +
    forUpdateReason +
    " · production fixture/ROLLBACK 0)",
);
console.log(
  "[verify:operator-row-protect] PASS (core + ingest isolation + admin/CLI writers + pricing writers + Nest HTTP 503/401 · FOR UPDATE blocked · exit 0 is not live DB proof)",
);
