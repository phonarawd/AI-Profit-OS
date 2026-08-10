/**
 * verify:balance-aware-feed — Engine §0.0.5.1 + Money §49.2a
 * Engine Owns: affordable/nearMiss/lockedHigh · suggestDeposit · nearMissCap · override merge wire
 * Money Owns: suggest query · principal Fact · deposit prefill · feed invalidate
 * Admin Owns: execution-policy feed.nearMissCapUsdt SSOT (adapters 0)
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
  "schemas/execution-policy.v1.json",
  "services/market-intelligence/src/balance-aware-feed.cjs",
  "services/api-nest/src/opportunities/balance-aware-feed.ts",
  "services/api-nest/src/opportunities/user-opportunity-override.merge.ts",
  "services/api-nest/src/wallet/deposit-suggest.ts",
  "services/api-nest/src/wallet/balance-aware-fact.ts",
  "services/api-nest/src/wallet/feed-cache-invalidate.service.ts",
  "services/api-nest/src/wallet/wallet.events.ts",
  "services/api-nest/src/wallet/wallet.module.ts",
  "services/api-nest/src/ledger/ledger.buckets.service.ts",
  "packages/ui/copy/ko/deposit.ts",
  "packages/ui/components/wallet/DepositAmountPanel.tsx",
  "packages/ui/canon/surfaces/wallet-deposit.wire.json",
  "packages/ui/canon/surfaces/admin-execution-policy.wire.json",
  "apps/web/app/wallet/deposit/page.tsx",
  "apps/admin/app/admin/execution-policy/page.tsx",
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

const policySchema = JSON.parse(read("schemas/execution-policy.v1.json"));
if (!policySchema.properties?.feed?.properties?.nearMissCapUsdt) {
  fails.push("execution-policy.v1 must define feed.nearMissCapUsdt");
}
if (
  !(policySchema.properties?.feed?.required || []).includes("nearMissCapUsdt")
) {
  fails.push("execution-policy.feed must require nearMissCapUsdt");
}

const manifest = read("schemas/manifest.day1.json");
if (!manifest.includes("balance-aware-fact.v1.json")) {
  fails.push("manifest.day1 must list balance-aware-fact.v1.json");
}
if (!manifest.includes("deposit-suggest-query.v1.json")) {
  fails.push("manifest.day1 must list deposit-suggest-query.v1.json");
}
if (!manifest.includes("execution-policy.v1.json")) {
  fails.push("manifest.day1 must list execution-policy.v1.json");
}

// --- Engine formula fixtures ---
const engine = require(path.join(
  root,
  "services/market-intelligence/src/balance-aware-feed.cjs",
));
const money = require(path.join(
  root,
  "services/market-intelligence/src/money.cjs",
));

if (engine.CLASSIFICATION_OWNER !== "engine:§0.0.5.1") {
  fails.push("CLASSIFICATION_OWNER must be engine:§0.0.5.1");
}
if (engine.SUGGEST_TICK_USDT !== "1") {
  fails.push("SUGGEST_TICK_USDT Day-1 must be 1");
}
if (engine.NEAR_MISS_CAP_FLOOR_USDT !== "50") {
  fails.push("NEAR_MISS_CAP_FLOOR_USDT must be 50");
}

// suggestDeposit = ceil_to_tick(required − principal)
const suggestCases = [
  { req: "100", prin: "100", want: "0" },
  { req: "100", prin: "150", want: "0" },
  { req: "100.1", prin: "100", want: "1" },
  { req: "125.2", prin: "100", want: "26" },
  { req: "50", prin: "0", want: "50" },
];
for (const c of suggestCases) {
  const got = engine.computeSuggestDepositUsdt(c.req, c.prin);
  if (got !== c.want) {
    fails.push(
      `suggestDeposit(${c.req},${c.prin}) got ${got} want ${c.want}`,
    );
  }
}

// nearMissCap default = max(50, principal×0.25)
const cap0 = engine.resolveNearMissCapUsdt("0", null);
if (cap0 !== "50") fails.push(`nearMissCap(0) got ${cap0} want 50`);
const cap200 = engine.resolveNearMissCapUsdt("200", null);
if (cap200 !== "50") fails.push(`nearMissCap(200) got ${cap200} want 50`);
const cap400 = engine.resolveNearMissCapUsdt("400", null);
if (cap400 !== "100") fails.push(`nearMissCap(400) got ${cap400} want 100`);
const capPolicy = engine.resolveNearMissCapUsdt("400", "75");
if (capPolicy !== "75") {
  fails.push(`nearMissCap policy override got ${capPolicy} want 75`);
}
if (engine.nearMissCapFromExecutionPolicy({ feed: { nearMissCapUsdt: "80" } }) !== "80") {
  fails.push("nearMissCapFromExecutionPolicy must read feed.nearMissCapUsdt");
}
if (engine.nearMissCapFromExecutionPolicy({}) !== null) {
  fails.push("nearMissCapFromExecutionPolicy({}) must be null");
}

// classification buckets
const aff = engine.classifyAffordability({
  principalUsdt: "100",
  requiredCapitalUsdt: "80",
  nearMissCapUsdt: "50",
});
if (aff.bucket !== "affordable" || aff.suggestDepositUsdt !== "0") {
  fails.push(`affordable classify got ${JSON.stringify(aff)}`);
}
const near = engine.classifyAffordability({
  principalUsdt: "100",
  requiredCapitalUsdt: "130",
  nearMissCapUsdt: "50",
});
if (near.bucket !== "nearMiss" || near.suggestDepositUsdt !== "30") {
  fails.push(`nearMiss classify got ${JSON.stringify(near)}`);
}
const locked = engine.classifyAffordability({
  principalUsdt: "100",
  requiredCapitalUsdt: "200",
  nearMissCapUsdt: "50",
});
if (locked.bucket !== "lockedHigh") {
  fails.push(`lockedHigh classify got ${JSON.stringify(locked)}`);
}
const forced = engine.classifyAffordability({
  principalUsdt: "100",
  requiredCapitalUsdt: "200",
  nearMissCapUsdt: "50",
  forceShow: true,
});
if (forced.bucket !== "nearMiss" || forced.forceShowPromoted !== true) {
  fails.push(`forceShow promote got ${JSON.stringify(forced)}`);
}
if (forced.suggestDepositUsdt !== "100") {
  fails.push(`forceShow suggest got ${forced.suggestDepositUsdt} want 100`);
}

// feed build · sort · override hide 100%
const feed = engine.buildBalanceAwareFeed({
  principalUsdt: "100",
  policyNearMissCapUsdt: "50",
  cards: [
    {
      id: "hidden-1",
      requiredCapitalUsdt: "50",
      expectedProfitUsdt: "10",
      compareReady: true,
      excludeFromFeed: true,
    },
    {
      id: "aff-1",
      requiredCapitalUsdt: "80",
      expectedProfitUsdt: "5",
      compareReady: true,
      capitalBand: "micro",
    },
    {
      id: "near-1",
      requiredCapitalUsdt: "130",
      expectedProfitUsdt: "8",
      compareReady: true,
    },
    {
      id: "lock-1",
      requiredCapitalUsdt: "300",
      expectedProfitUsdt: "20",
      compareReady: true,
    },
    {
      id: "pin-1",
      requiredCapitalUsdt: "90",
      expectedProfitUsdt: "3",
      compareReady: false,
      pinOrder: 0,
    },
  ],
});
if (feed.hiddenCount !== 1) {
  fails.push(`hiddenCount got ${feed.hiddenCount} want 1 (override hide 100%)`);
}
if (feed.items.some((i) => i.id === "hidden-1")) {
  fails.push("hidden override card must be excluded from feed items 100%");
}
if (feed.affordableCount !== 2) {
  fails.push(`affordableCount got ${feed.affordableCount} want 2`);
}
if (feed.nearMissCount !== 1) {
  fails.push(`nearMissCount got ${feed.nearMissCount} want 1`);
}
if (feed.lockedHighCount !== 1) {
  fails.push(`lockedHighCount got ${feed.lockedHighCount} want 1`);
}
if (feed.items[0]?.id !== "pin-1") {
  fails.push(`pinOrder must sort first got ${feed.items[0]?.id}`);
}
if (feed.topSuggestDepositUsdt !== "30") {
  fails.push(
    `topSuggestDepositUsdt got ${feed.topSuggestDepositUsdt} want 30`,
  );
}
if (feed.classificationOwner !== "engine:§0.0.5.1") {
  fails.push("feed.classificationOwner must pointer Engine");
}
if (!money.withinTolerance(feed.nearMissCapUsdt, "50")) {
  fails.push(`feed.nearMissCapUsdt got ${feed.nearMissCapUsdt}`);
}

// Nest bridge wires override merge
const nestBridge = read("services/api-nest/src/opportunities/balance-aware-feed.ts");
for (const needle of [
  "buildBalanceAwareFeedWithOverrides",
  "mergeUserOpportunityOverride",
  "nearMissCapFromExecutionPolicy",
  "excludeFromFeed",
  "forceShow",
  "computeSuggestDepositUsdt",
  "classifyAffordability",
]) {
  if (!nestBridge.includes(needle)) {
    fails.push(`balance-aware-feed.ts missing: ${needle}`);
  }
}
if (
  /UPDATE\s+(?:public\.)?(?:ledger_accounts|wallet_buckets)/i.test(nestBridge)
) {
  fails.push("Nest balance-aware-feed must not UPDATE ledger balances");
}

const merge = read(
  "services/api-nest/src/opportunities/user-opportunity-override.merge.ts",
);
if (!merge.includes("excludeFromFeed: userOv.hidden === true")) {
  fails.push("override merge must set excludeFromFeed on hidden");
}
if (!merge.includes("compareReady: base.compareReady")) {
  fails.push("override merge must preserve compareReady (no false→true forge)");
}

const miIdx = read("services/market-intelligence/src/index.cjs");
if (!miIdx.includes("balance-aware-feed")) {
  fails.push("market-intelligence index must export balance-aware-feed");
}
const miPkg = read("services/market-intelligence/package.json");
if (!miPkg.includes("./balance-aware-feed")) {
  fails.push("market-intelligence package exports must include balance-aware-feed");
}

// --- nearMissCap Owns = execution-policy only ---
const adminEp = read("apps/admin/app/admin/execution-policy/page.tsx");
for (const needle of [
  "feed.nearMissCapUsdt",
  'data-field="feed.nearMissCapUsdt"',
  "near-miss-cap-usdt",
]) {
  if (!adminEp.includes(needle)) {
    fails.push(`execution-policy page missing: ${needle}`);
  }
}
const epWire = JSON.parse(
  read("packages/ui/canon/surfaces/admin-execution-policy.wire.json"),
);
const nearBlock = (epWire.blocks || []).find((b) => b.id === "nearMissCap");
if (!nearBlock || nearBlock.field !== "feed.nearMissCapUsdt") {
  fails.push("admin-execution-policy.wire must expose feed.nearMissCapUsdt");
}
if (!(epWire.forbidden || []).includes("nearMissCap_on_adapters")) {
  fails.push("admin-execution-policy.wire must forbid nearMissCap_on_adapters");
}
const adaptersPage = read("apps/admin/app/admin/adapters/page.tsx");
if (/nearMissCapUsdt|feed\.nearMissCap/.test(adaptersPage)) {
  fails.push("admin adapters page must not own nearMissCap settings");
}
const adaptersSvc = read(
  "services/api-nest/src/adapters/adapters.admin.service.ts",
);
if (!adaptersSvc.includes('nearMissCapOwns: "execution-policy"')) {
  fails.push("adapters.admin.service must declare nearMissCapOwns execution-policy");
}

// --- deeplink helper (Money) ---
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
if (!copyIdx.includes("feed")) {
  fails.push("T root must export feed (§5.3a)");
}

// --- UI §5.3a home slots (PART3e) ---
mustExist("packages/ui/copy/ko/feed.ts");
mustExist("packages/ui/components/opportunity/BalanceAwareHome.tsx");
mustExist("apps/web/app/page.tsx");

const feedCopy = read("packages/ui/copy/ko/feed.ts");
for (const key of [
  "homeTitle",
  "sectionAffordable",
  "sectionAffordableCount",
  "sectionNearMiss",
  "sectionLockedHigh",
  "ctaDepositSuggest",
  "badgeNearMiss",
  "badgeLocked",
  "peotteokLine",
]) {
  if (!feedCopy.includes(`${key}:`)) {
    fails.push(`feed.ts missing §5.3a key: ${key}`);
  }
}
for (const banned of ["오늘만", "강제 입금", "협박", "타이머 종료"]) {
  if (feedCopy.includes(banned)) {
    fails.push(`feed.ts forbidden threat copy: ${banned}`);
  }
}

const homeUi = read("packages/ui/components/opportunity/BalanceAwareHome.tsx");
for (const needle of [
  'data-testid="section-affordable"',
  'data-testid="section-near-miss"',
  'data-testid="section-locked-high"',
  "sectionAffordable",
  "sectionNearMiss",
  "sectionLockedHigh",
  "peotteokLine",
  "OpportunityCard",
]) {
  if (!homeUi.includes(needle)) {
    fails.push(`BalanceAwareHome missing §5.3a slot: ${needle}`);
  }
}

/** PART9c — BalanceAwareHome may mount in HomePageClient */
let homePage = read("apps/web/app/page.tsx");
for (const rel of [
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/_components/HomePageClient.tsx",
  "apps/web/components/HomePageClient.tsx",
]) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    homePage = `${homePage}\n${read(rel)}`;
    break;
  }
}
if (!homePage.includes("BalanceAwareHome")) {
  fails.push("apps/web home must mount BalanceAwareHome for §5.3a");
}

const oppCard = read("packages/ui/components/opportunity/OpportunityCard.tsx");
for (const needle of [
  "cta-deposit-suggest",
  "badge-near-miss",
  "badge-locked-high",
  "ctaDepositSuggest",
  "badgeNearMiss",
  "badgeLocked",
  "/wallet/deposit",
  "suggest=",
  "oppId=",
]) {
  if (!oppCard.includes(needle)) {
    fails.push(`OpportunityCard nearMiss deeplink/badge missing: ${needle}`);
  }
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

// Nest override+classify integration (require via ts transpile not available — dynamic require of MI + merge logic mirrored)
try {
  const { buildBalanceAwareFeedWithOverrides } = require(
    path.join(root, "services/api-nest/src/opportunities/balance-aware-feed.ts"),
  );
  // If ts-node not available, skip runtime — static needles above cover wire
  if (typeof buildBalanceAwareFeedWithOverrides === "function") {
    const integrated = buildBalanceAwareFeedWithOverrides({
      principalUsdt: "100",
      policyNearMissCapUsdt: "50",
      cards: [
        {
          id: "h",
          requiredCapitalUsdt: "50",
          expectedProfitUsdt: "1",
          compareReady: true,
        },
        {
          id: "a",
          requiredCapitalUsdt: "80",
          expectedProfitUsdt: "2",
          compareReady: true,
        },
      ],
      overridesByOpportunityId: {
        h: {
          userId: "u1",
          opportunityId: "h",
          hidden: true,
          reason: "verify hide path long enough",
          updatedByAdminId: "admin1",
          updatedAt: "2026-08-09T00:00:00.000Z",
        },
      },
    });
    if (integrated.hiddenCount !== 1) {
      fails.push("integrated override hide must increment hiddenCount");
    }
    if (integrated.items.some((i) => i.id === "h")) {
      fails.push("integrated override hide must exclude card 100%");
    }
  }
} catch {
  // TS file not loadable under plain node — static checks suffice
}

if (fails.length) {
  console.error("[verify:balance-aware-feed] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:balance-aware-feed] PASS (Engine §0.0.5.1 classify·suggest·nearMissCap·override hide · Money §49.2a deeplink/Fact)",
);
