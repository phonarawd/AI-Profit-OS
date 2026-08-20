/**
 * verify:user-opportunity-feed — Engine §0.9 E-R3
 * GET /api/v1/opportunities(+/:id) · OpportunitiesUserController
 * OPPORTUNITY_USER_ROUTES · buildBalanceAwareFeedWithOverrides
 * executionPlatforms 유저0 · arbitrageTypeKo pass-through · admin 분리
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

const files = [
  "schemas/opportunity-card.v1.json",
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  "services/api-nest/src/opportunities/balance-aware-feed.ts",
  "services/api-nest/src/opportunities/opportunities.module.ts",
  "services/market-intelligence/src/capital-provider-projection.cjs",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:user-opportunity-feed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const routes = read(
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
);
const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
);
const svc = read(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
);
const mod = read("services/api-nest/src/opportunities/opportunities.module.ts");
const adminCtrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
const idx = read("services/api-nest/src/opportunities/index.ts");
const schema = JSON.parse(read("schemas/opportunity-card.v1.json"));

// --- routes SSOT ---
if (!/export const OPPORTUNITY_USER_ROUTES\s*=\s*\{/.test(routes)) {
  fails.push("OPPORTUNITY_USER_ROUTES must be exported as const object");
}
if (!routes.includes('list: "opportunities"')) {
  fails.push('OPPORTUNITY_USER_ROUTES.list must be "opportunities"');
}
if (!routes.includes('get: "opportunities/:id"')) {
  fails.push('OPPORTUNITY_USER_ROUTES.get must be "opportunities/:id"');
}
if (!/as const/.test(routes)) {
  fails.push("OPPORTUNITY_USER_ROUTES must use as const");
}
if (routes.includes("OPPORTUNITY_ADMIN_ROUTES")) {
  fails.push("user routes must not import/share OPPORTUNITY_ADMIN_ROUTES");
}

// --- controller separation ---
if (!ctrl.includes("export class OpportunitiesUserController")) {
  fails.push("OpportunitiesUserController class missing");
}
if (!ctrl.includes("OPPORTUNITY_USER_ROUTES")) {
  fails.push("user controller must use OPPORTUNITY_USER_ROUTES");
}
if (!ctrl.includes("@Get(OPPORTUNITY_USER_ROUTES.list)")) {
  fails.push("GET list must bind OPPORTUNITY_USER_ROUTES.list");
}
if (!ctrl.includes("@Get(OPPORTUNITY_USER_ROUTES.get)")) {
  fails.push("GET :id must bind OPPORTUNITY_USER_ROUTES.get");
}
if (/@Controller\(\s*["']admin["']\s*\)/.test(ctrl)) {
  fails.push("OpportunitiesUserController must not be under admin");
}
if (adminCtrl.includes("OpportunitiesUserController")) {
  fails.push("admin controller must stay separate from user controller");
}
if (adminCtrl.includes("OPPORTUNITY_USER_ROUTES")) {
  fails.push("admin controller must not use OPPORTUNITY_USER_ROUTES");
}

// §0.9.3 — JWT session only · query/body userId FORBIDDEN
if (/@Query\(\s*["']userId["']\s*\)/.test(ctrl)) {
  fails.push("user controller must not take @Query('userId')");
}
if (/body\.userId/.test(ctrl)) {
  fails.push("user controller must not trust body.userId");
}
if (!ctrl.includes("req.user")) {
  fails.push("user controller must derive userId from JWT req.user");
}
if (!ctrl.includes("AUTH_REQUIRED") && !ctrl.includes("UnauthorizedException")) {
  fails.push("missing session UnauthorizedException / AUTH_REQUIRED");
}

// --- service wiring ---
if (!svc.includes("buildBalanceAwareFeedWithOverrides")) {
  fails.push("user service must call buildBalanceAwareFeedWithOverrides");
}
if (!svc.includes("excludeParticipatedFromFeed")) {
  fails.push("user service must apply B-FEED-001 excludeParticipatedFromFeed");
}
if (!svc.includes("applyStableFeedCaps")) {
  fails.push("user service must apply B-FEED-001 applyStableFeedCaps (no random)");
}
if (!svc.includes("projectCapitalProviderUserSurface")) {
  fails.push("user service must project via projectCapitalProviderUserSurface");
}
if (!svc.includes("arbitrage_type_ko") && !svc.includes("arbitrageTypeKo")) {
  fails.push("user service must pass-through arbitrageTypeKo");
}
if (!/arbitrageTypeKo:\s*row\.arbitrage_type_ko/.test(svc)) {
  fails.push("arbitrageTypeKo must be DB pass-through (row.arbitrage_type_ko)");
}
if (!svc.includes("executionPlatforms")) {
  fails.push("service must load executionPlatforms before strip (INTERNAL)");
}
if (!svc.includes('audience: "user"') && !svc.includes("audience: 'user'")) {
  fails.push("projectCapitalProviderUserSurface audience must be user");
}

// --- module registration ---
if (!mod.includes("OpportunitiesUserController")) {
  fails.push("OpportunitiesModule must register OpportunitiesUserController");
}
if (!mod.includes("OpportunitiesUserService")) {
  fails.push("OpportunitiesModule must provide OpportunitiesUserService");
}
if (!mod.includes("LedgerModule")) {
  fails.push("OpportunitiesModule must import LedgerModule (principal)");
}
if (!mod.includes("ExecutionPolicyModule")) {
  fails.push("OpportunitiesModule must import ExecutionPolicyModule (nearMissCap)");
}
if (!idx.includes("OPPORTUNITY_USER_ROUTES")) {
  fails.push("opportunities/index.ts must export OPPORTUNITY_USER_ROUTES");
}

// --- schema contract ---
for (const req of [
  "id",
  "arbitrageType",
  "arbitrageTypeKo",
  "executionMode",
  "assetImageUrl",
  "requiredCapitalUsdt",
  "expectedProfitUsdt",
  "status",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`opportunity-card.v1 must require ${req}`);
  }
}
if (!schema.properties?.executionPlatforms) {
  fails.push("schema must document executionPlatforms (INTERNAL)");
}
if (!String(schema.properties.executionPlatforms.description || "").includes("user UI 0")) {
  fails.push("executionPlatforms description must lock user UI 0");
}
if (schema.additionalProperties !== false) {
  fails.push("opportunity-card.v1 must keep additionalProperties: false");
}
for (const field of ["buyMarketId", "buyMarketLabelKo"]) {
  if (!schema.properties?.[field]) {
    fails.push(`opportunity-card.v1 must document optional ${field}`);
  }
  if ((schema.required || []).includes(field)) {
    fails.push(`opportunity-card.v1 ${field} must stay optional (not required)`);
  }
}
if ((schema.properties?.buyMarketId?.enum || []).includes("yahoo_jp")) {
  fails.push("opportunity-card.v1 buyMarketId enum must not include yahoo_jp");
}

// --- package script ---
const pkg = JSON.parse(read("package.json"));
if (pkg.scripts?.["verify:user-opportunity-feed"] !== "node tooling/verify/user-opportunity-feed.cjs") {
  fails.push("package.json missing verify:user-opportunity-feed script");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("user-opportunity-feed")) {
  fails.push("CATALOG.md must list user-opportunity-feed");
}

// --- PTF-00C P0-E/C-01: feed/getById read-time freshness (§12/§21) ---
if (!svc.includes("@Inject(CLOCK)")) {
  fails.push("C-01: OpportunitiesUserService must inject the canonical CLOCK seam");
}
if (!svc.includes("settlement_rule.cjs")) {
  fails.push("C-01: must reuse settlement_rule.cjs (same canonical threshold as participate — no duplicate magic TTL)");
}
if (!/DEFAULT_PRICE_STALE_MAX_SEC/.test(svc)) {
  fails.push("C-01: must reuse DEFAULT_PRICE_STALE_MAX_SEC, not a locally hardcoded seconds constant");
}
if (!/isRowFresh/.test(svc) || !/\.filter\(\(r\) => this\.isRowFresh/.test(svc)) {
  fails.push("C-01: listFeed must filter rows through isRowFresh before classification (exclude already-stale)");
}
if (!/getById[\s\S]{0,400}isRowFresh/.test(svc)) {
  fails.push("C-01: getById must apply the same freshness authority as the feed");
}
{
  const svcCode = svc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  if (/Date\.now\(\)/.test(svcCode)) {
    fails.push("C-01: opportunities.user.service.ts must not bypass the Clock seam with Date.now()");
  }
}

// --- C-01 behavioral: fresh / exact boundary / just-stale (no wall-clock flake) ---
const settlementRule = require(path.join(root, "services/engine-rust/settlement_rule.cjs"));
{
  const staleAtMs = 1_700_000_000_000;
  const maxSec = settlementRule.DEFAULT_PRICE_STALE_MAX_SEC;
  const fresh = settlementRule.isPriceFresh({ nowMs: staleAtMs, staleAtMs, priceStaleMaxSec: maxSec });
  const atBoundary = settlementRule.isPriceFresh({
    nowMs: staleAtMs + maxSec * 1000,
    staleAtMs,
    priceStaleMaxSec: maxSec,
  });
  const justStale = settlementRule.isPriceFresh({
    nowMs: staleAtMs + (maxSec + 1) * 1000 + 1,
    staleAtMs,
    priceStaleMaxSec: maxSec,
  });
  if (!fresh) fails.push("C-01: nowMs==staleAtMs must be fresh");
  if (!atBoundary) fails.push("C-01: exact boundary (age==maxSec) must still be fresh (matches participate's guard)");
  if (justStale) fails.push("C-01: age > maxSec by more than a second must be stale");
}

// --- MI strip invariant (runtime) ---
const mi = require(path.join(
  root,
  "services/market-intelligence/src/capital-provider-projection.cjs",
));
const projected = mi.projectCapitalProviderUserSurface(
  {
    id: "opp-1",
    arbitrageType: "price",
    arbitrageTypeKo: "시세차익",
    executionMode: "orchestrate",
    executionPlatforms: ["ebay_us", "admin"],
    expectedSellDays: 3,
    requiredCapitalUsdt: "50",
  },
  { audience: "user" },
);
if ("executionPlatforms" in projected) {
  fails.push("user projection must strip executionPlatforms");
}
if ("expectedSellDays" in projected) {
  fails.push("user projection must strip expectedSellDays");
}
if (projected.arbitrageTypeKo !== "시세차익") {
  fails.push("arbitrageTypeKo must pass through projection");
}

// --- 03 Market Label Projection: list lift · pricing leak 0 ---
if (!/includePricing:\s*false/.test(svc)) {
  fails.push("listFeed must keep includePricing: false (pricing leak 0)");
}
if (!/includePricing:\s*true/.test(svc)) {
  fails.push("getById may keep includePricing: true (Detail 범위 · 변경 금지)");
}
if (!/pricing\.buyMarketId/.test(svc) || !/pricing\.buyMarketLabelKo/.test(svc)) {
  fails.push("toUserCard must lift buyMarketId/buyMarketLabelKo from pricing");
}
{
  const listSlice = svc.match(
    /async listFeed\([\s\S]*?async getById/,
  );
  if (!listSlice) {
    fails.push("listFeed block must be locatable before getById");
  } else {
    if (!/includePricing:\s*false/.test(listSlice[0])) {
      fails.push("listFeed toUserCard must pass includePricing: false");
    }
    if (/includePricing:\s*true/.test(listSlice[0])) {
      fails.push("listFeed must not enable includePricing");
    }
  }
}
{
  const toUser = svc.match(
    /private toUserCard\([\s\S]*$/,
  );
  if (!toUser) {
    fails.push("toUserCard must exist");
  } else {
    const body = toUser[0];
    if (!/if \(opts\.includePricing\)/.test(body)) {
      fails.push("toUserCard must gate the pricing object on includePricing");
    }
    if (
      !/buyMarketId\s*[:=]/.test(body) ||
      !/buyMarketLabelKo\s*[:=]/.test(body)
    ) {
      fails.push("toUserCard must assign top-level buyMarketId/buyMarketLabelKo");
    }
    if (/\.\.\.\s*pricing/.test(body)) {
      fails.push("toUserCard must not spread the pricing object onto the user card");
    }
  }
}

// --- 08 Freshness forensic lock (listing 300s 유지 · opportunity expiry 복사 금지 · ingest formula 금지) ---
if (settlementRule.DEFAULT_PRICE_STALE_MAX_SEC !== 3) {
  fails.push("08: DEFAULT_PRICE_STALE_MAX_SEC must stay 3");
}
if (/stale_at\s*=\s*now\(\)/.test(svc)) {
  fails.push("08: user feed must not UPDATE stale_at = now()");
}
const seedBuilder = read("services/market-intelligence/src/catalog-runtime-seed.cjs");
if (!/LISTING_STALE_SEC = 300/.test(seedBuilder)) {
  fails.push("08: seed LISTING_STALE_SEC must stay 300 (forensic 전 시드 의미 변경 금지)");
}
const ebayAdapter = read("workers/ebay-adapter/src/constants.ts");
if (!/CACHE_HINT_SEC = 300/.test(ebayAdapter)) {
  fails.push("08: ebay CACHE_HINT_SEC must stay 300");
}
const ingest = read("services/api-nest/src/adapters/adapters.admin.service.ts");
if (/upsertOpportunityFromBundle|repriceFromListings|fromListings\(/.test(ingest)) {
  fails.push(
    "08: adapters ingest must not grow its own opportunity reprice (owner는 persist hook)",
  );
}
if (ingest.includes("computeOpportunityPricing") || ingest.includes("resolveStoredLegListingPrices")) {
  fails.push("08: adapters ingest must not copy pricing formula / listing resolver");
}
{
  const seedMi = require(path.join(
    root,
    "services/market-intelligence/src/catalog-runtime-seed.cjs",
  ));
  const locked = seedMi.buildMinCatalogRuntimeSeed({
    observedAt: "2026-08-19T00:00:00.000Z",
  });
  for (const b of locked.bundles) {
    if (b.opportunity.staleAt !== b.opportunity.pricedAt) {
      fails.push("08: seed opportunity.staleAt must equal pricedAt (expiry 복사 금지)");
    }
    if (b.listings.some((L) => L.staleAt === b.opportunity.staleAt)) {
      fails.push("08: opportunity.staleAt must not copy listing +300s expiry");
    }
  }
}

if (fails.length) {
  console.error("[verify:user-opportunity-feed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:user-opportunity-feed] PASS (OpportunitiesUserController · feed+get · strip platforms · buyMarketLabelKo lift · list pricing 0)",
);
