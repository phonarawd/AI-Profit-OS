/**
 * verify:balance-aware-feed — Money §49.2a path (v7.22.21)
 * Money Owns: suggest query · principal Fact · deposit prefill · feed invalidate signal
 * Engine Owns: classification / suggestDeposit formula (§0.0.5.1) — pointer only here
 * UI Owns: feed card copy §5.3a (not asserted as Money live surface)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/balance-aware-fact.v1.json",
  "schemas/deposit-suggest-query.v1.json",
  "schemas/wallet-buckets.v1.json",
  "services/api-nest/src/wallet/deposit-suggest.ts",
  "services/api-nest/src/wallet/balance-aware-fact.ts",
  "services/api-nest/src/wallet/feed-cache-invalidate.service.ts",
  "services/api-nest/src/wallet/wallet.events.ts",
  "services/api-nest/src/wallet/wallet.module.ts",
  "services/api-nest/src/ledger/ledger.buckets.service.ts",
  "packages/ui/copy/ko/deposit.ts",
  "packages/ui/components/wallet/DepositAmountPanel.tsx",
  "packages/ui/canon/surfaces/wallet-deposit.wire.json",
  "apps/web/app/wallet/deposit/page.tsx",
];
for (const f of files) mustExist(f);

// --- schemas ---
const factSchema = JSON.parse(read("schemas/balance-aware-fact.v1.json"));
for (const req of ["principalUsdt", "classificationOwner"]) {
  if (!(factSchema.required || []).includes(req)) {
    fails.push(`balance-aware-fact.v1 must require ${req}`);
  }
}
if (factSchema.properties?.classificationOwner?.const !== "engine:§0.0.5.1") {
  fails.push("classificationOwner must const engine:§0.0.5.1");
}
for (const opt of ["affordableCount", "nearMissCount", "topSuggestDepositUsdt"]) {
  if (!factSchema.properties?.[opt]) {
    fails.push(`balance-aware-fact.v1 missing optional Fact field ${opt}`);
  }
}

const suggestSchema = JSON.parse(read("schemas/deposit-suggest-query.v1.json"));
for (const req of ["tab", "suggest", "oppId"]) {
  if (!(suggestSchema.required || []).includes(req)) {
    fails.push(`deposit-suggest-query.v1 must require ${req}`);
  }
}
if (!(suggestSchema.properties?.tab?.enum || []).includes("usdt")) {
  fails.push("deposit-suggest-query tab must include usdt");
}

const bucketsSchema = JSON.parse(read("schemas/wallet-buckets.v1.json"));
if (!(bucketsSchema.required || []).includes("principalUsdt")) {
  fails.push("wallet-buckets must require principalUsdt (participate SoT)");
}

const manifest = read("schemas/manifest.day1.json");
if (!manifest.includes("balance-aware-fact.v1.json")) {
  fails.push("manifest.day1 must list balance-aware-fact.v1.json");
}
if (!manifest.includes("deposit-suggest-query.v1.json")) {
  fails.push("manifest.day1 must list deposit-suggest-query.v1.json");
}

// --- deeplink helper ---
const suggestTs = read("services/api-nest/src/wallet/deposit-suggest.ts");
for (const needle of [
  "buildDepositSuggestHref",
  "parseDepositSuggestQuery",
  "DEPOSIT_QUICK_USDT",
  "/wallet/deposit",
  "tab",
  "suggest",
  "oppId",
  "engine:§0.0.5.1",
  "[10, 50, 100, 500]",
]) {
  if (!suggestTs.includes(needle)) {
    fails.push(`deposit-suggest.ts missing: ${needle}`);
  }
}
// Money must NOT own classification formula
for (const banned of [
  "requiredCapitalUsdt -",
  "requiredCapitalUsdt −",
  "nearMissCap",
  "affordable",
  "lockedHigh",
]) {
  if (suggestTs.includes(banned)) {
    fails.push(`deposit-suggest.ts must not implement Engine formula (${banned})`);
  }
}

// --- Fact pass-through ---
const factTs = read("services/api-nest/src/wallet/balance-aware-fact.ts");
for (const needle of [
  "buildBalanceAwareFact",
  "principalForParticipate",
  "principalUsdt",
  "affordableCount",
  "nearMissCount",
  "topSuggestDepositUsdt",
  "BALANCE_AWARE_CLASSIFICATION_OWNER",
  "engine:§0.0.5.1",
  'participateCapitalSource: "principal"',
]) {
  if (!factTs.includes(needle)) {
    fails.push(`balance-aware-fact.ts missing: ${needle}`);
  }
}
if (/requiredCapitalUsdt\s*[-−]/.test(factTs) || factTs.includes("nearMissCap")) {
  fails.push("balance-aware-fact.ts must not compute suggestDeposit / nearMissCap");
}

// --- feed cache invalidate ---
const invalidate = read(
  "services/api-nest/src/wallet/feed-cache-invalidate.service.ts",
);
for (const needle of [
  "WALLET_EVENTS.depositConfirmed",
  "WALLET_EVENTS.feedCacheInvalidate",
  "classificationOwner",
  "ledgerMutated: false",
  "engine:§0.0.5.1",
]) {
  if (!invalidate.includes(needle)) {
    fails.push(`feed-cache-invalidate.service missing: ${needle}`);
  }
}
if (
  /UPDATE\s+(?:public\.)?(?:ledger_accounts|wallet_buckets)/i.test(invalidate) ||
  /balance_usdt\s*=/.test(invalidate)
) {
  fails.push("feed-cache-invalidate must not UPDATE ledger/wallet balances");
}

const events = read("services/api-nest/src/wallet/wallet.events.ts");
if (!events.includes('feedCacheInvalidate: "wallet.feed.cache_invalidate"')) {
  fails.push("WALLET_EVENTS must include wallet.feed.cache_invalidate");
}
if (!events.includes('depositConfirmed: "wallet.deposit.confirmed"')) {
  fails.push("WALLET_EVENTS must keep wallet.deposit.confirmed");
}

const mod = read("services/api-nest/src/wallet/wallet.module.ts");
if (!mod.includes("FeedCacheInvalidateService")) {
  fails.push("WalletModule must register FeedCacheInvalidateService");
}

const bucketsSvc = read("services/api-nest/src/ledger/ledger.buckets.service.ts");
if (!bucketsSvc.includes("principalUsdt")) {
  fails.push("LedgerBucketsService must expose principalUsdt");
}

// --- deposit UI ---
const copy = read("packages/ui/copy/ko/deposit.ts");
for (const key of [
  "pageTitle",
  "suggestChip",
  "suggestPrefillHint",
  "krwSuggestNote",
  "optionalHint",
]) {
  if (!copy.includes(key)) fails.push(`deposit copy missing key: ${key}`);
}
for (const banned of ["오늘만", "강제 입금", "TRC20", "API", "NATS"]) {
  if (copy.includes(banned)) {
    fails.push(`deposit copy forbidden jargon/threat: ${banned}`);
  }
}

const panel = read("packages/ui/components/wallet/DepositAmountPanel.tsx");
for (const needle of [
  'data-testid="deposit-amount-panel"',
  'data-testid="deposit-amount-input"',
  'data-testid="deposit-suggest-chip"',
  'data-force-deposit="false"',
  "suggestUsdt",
  "[10, 50, 100, 500]",
  "T.deposit",
]) {
  if (!panel.includes(needle)) {
    fails.push(`DepositAmountPanel missing: ${needle}`);
  }
}

const page = read("apps/web/app/wallet/deposit/page.tsx");
for (const needle of [
  "DepositAmountPanel",
  'searchParams.get("suggest")',
  'searchParams.get("oppId")',
  'searchParams.get("tab")',
  'data-classification-owner="engine:§0.0.5.1"',
  "T.deposit",
]) {
  if (!page.includes(needle)) {
    fails.push(`deposit page missing: ${needle}`);
  }
}
if (!page.includes("/wallet/deposit")) {
  fails.push("deposit page must stay on /wallet/deposit route");
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/wallet-deposit.wire.json"),
);
if (wire.route !== "/wallet/deposit") {
  fails.push("wallet-deposit.wire route must be /wallet/deposit");
}
if (!String(wire.deeplink || "").includes("suggest={suggestDepositUsdt}")) {
  fails.push("wallet-deposit.wire deeplink must include suggest={suggestDepositUsdt}");
}
if (!String(wire.deeplink || "").includes("oppId={id}")) {
  fails.push("wallet-deposit.wire deeplink must include oppId={id}");
}
if (wire.suggestOwner !== "engine:§0.0.5.1") {
  fails.push("wallet-deposit.wire suggestOwner must pointer Engine §0.0.5.1");
}
if (!(wire.forbidden || []).includes("force_deposit")) {
  fails.push("wallet-deposit.wire must forbid force_deposit");
}
if (!(wire.forbidden || []).includes("ledger_balance_update")) {
  fails.push("wallet-deposit.wire must forbid ledger_balance_update");
}

const canonManifest = read("packages/ui/canon/manifest.json");
if (!canonManifest.includes("wallet-deposit")) {
  fails.push("canon manifest must register wallet-deposit");
}

const copyIdx = read("packages/ui/copy/ko/index.ts");
if (!copyIdx.includes("deposit")) {
  fails.push("T root must export deposit");
}

// --- Money path must not invent Engine classification in wallet money files ---
const moneyScan = [
  "services/api-nest/src/wallet/deposit-suggest.ts",
  "services/api-nest/src/wallet/balance-aware-fact.ts",
  "services/api-nest/src/wallet/feed-cache-invalidate.service.ts",
];
for (const rel of moneyScan) {
  const t = read(rel);
  if (/ceil_to_tick|suggestDepositUsdt\s*=/.test(t) && /requiredCapital/.test(t)) {
    fails.push(`${rel} must not assign suggestDeposit from requiredCapital (Engine Owns)`);
  }
  if (
    /UPDATE\s+(?:public\.)?ledger_accounts[\s\S]{0,200}balance_usdt/i.test(t)
  ) {
    fails.push(`${rel} ledger balance UPDATE forbidden`);
  }
}

if (fails.length) {
  console.error("[verify:balance-aware-feed] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:balance-aware-feed] PASS (Money §49.2a suggest query · principal Fact · deposit prefill · feed invalidate · Engine pointer)",
);
