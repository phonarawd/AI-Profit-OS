/** Type surface for @aipo/market-intelligence (implementation = *.cjs) */

export const MARKET_IDS: readonly [
  "ebay_us",
  "ebay_gb",
  "ebay_de",
  "ebay_au",
  "admin",
];
export const DAY1_MARKET_IDS: typeof MARKET_IDS;
export const PARTNER_MARKET_IDS: readonly [
  "amazon_us",
  "amazon_jp",
  "amazon_de",
  "yahoo_jp",
];
export const PARTNER_LISTING_ADAPTER_IDS: readonly ["amazon", "yahoo_jp"];
export const MARKET_PARTNERS: ReadonlyArray<{
  partnerId: string;
  adapterId: string;
  labelKo: string;
  tier: "A" | "B" | "C";
  officialPartner: true;
  uiTrustStrip: "always" | "edu" | "wallet";
  listingLegPhase: "Day-1" | "Phase1+" | "catalog" | "fx";
  logoAsset: string;
  marketIds?: string[];
  worker?: string;
}>;
export const MARKET_LABEL_KO: Readonly<Record<string, string>>;
export function isPartnerListingAdapterId(adapterId: string): boolean;
export function isPartnerMarketId(marketId: string): boolean;
export function tierATrustStripPartners(): typeof MARKET_PARTNERS;
export function isIngestableAdapterId(adapterId: string): boolean;
export const CAPITAL_BANDS: readonly [
  "micro",
  "small",
  "mid",
  "high",
  "whale",
];
export const CAPITAL_BAND_RANK: Readonly<Record<string, number>>;
export const BAND_MIN: Readonly<Record<string, string>>;
export const BAND_MAX: Readonly<Record<string, string | null>>;
export const CAPITAL_BAND_LABEL_KO: Readonly<Record<string, string>>;
export const CATEGORY_FILTER_CHIPS: ReadonlyArray<{
  key: string;
  labelKo: string;
  category: string | null;
}>;
export const CAPITAL_FILTER_CHIPS: ReadonlyArray<{
  key: string;
  labelKo: string;
  capitalBands: readonly string[];
}>;
export const SEED_RATIO_LOCK: {
  readonly microSmallMinPct: 40;
  readonly midMinPct: 25;
  readonly highWhaleMaxPct: 35;
};
export const DEPOSIT_QUICK_SMALL_USDT: readonly string[];
export const DEPOSIT_QUICK_WHALE_USDT: readonly string[];
export const ONBOARDING_LINE_KO: string;
export const DEFAULT_FEE_PCT: { readonly ebay: string; readonly admin: string };
export const DEFAULT_PLATFORM_MARGIN_PCT: string;
export const PIPELINE_STAGES: readonly string[];
export const FORBIDDEN_MARKET_IDS: readonly string[];
export const FORBIDDEN_ADAPTER_IDS: readonly string[];
export const FX_FORMULA_IDS: readonly [
  "cg_usdt_krw",
  "cg_usdt_usd__frank_usd_krw",
];
export const IMAGE_RIGHTS_NOTE_KO: "시세 참고용";
export const ASSET_CATEGORIES: readonly [
  "watch",
  "trading_card",
  "luxury_bag",
];

export function computeOpportunityPricing(input: {
  buyMarketId: string;
  buyPriceUsdt: string;
  sellMarketId: string;
  sellPriceUsdt: string;
  platformMarginPct?: string;
  adminMarginPct?: string;
  riskBufferPct?: string;
  minRiskBufferUsdt?: string;
  feePct?: { ebay?: string; admin?: string };
  requiredCapitalUsdt?: string;
  useAdminOverride?: boolean;
  pricingSource?: "adapter" | "admin" | "blended";
  gradeMismatch?: boolean;
  imageMissing?: boolean;
  legsFresh?: boolean;
}): {
  buyMarketId: string;
  buyMarketLabelKo: string;
  buyPriceUsdt: string;
  sellMarketId: string;
  sellMarketLabelKo: string;
  sellPriceUsdt: string;
  grossSpreadUsdt: string;
  buyLegFeeUsdt: string;
  sellLegFeeUsdt: string;
  feesUsdt: string;
  riskBufferUsdt: string;
  costBufferUsdt: string;
  platformMarginUsdt: string;
  expectedProfitUsdt: string;
  effectiveMarginPct: string;
  compareReady: boolean;
  capitalBand: string;
  useAdminOverride: boolean;
  pricingSource: string;
  gradeMismatch: boolean;
  imageMissing: boolean;
};

export function composeFxSnapshot(input: {
  primary?: { usdtKrw: string };
  fallback?: { usdtUsd: string; usdKrw: string };
  fxSnapshotId?: string;
  capturedAt?: string;
}): {
  fxSnapshotId: string;
  formulaId: "cg_usdt_krw" | "cg_usdt_usd__frank_usd_krw";
  sources: string[];
  usdtKrw: string;
  usdtUsd: string | null;
  usdKrwFrank: string | null;
  usdKrw: string;
  capturedAt: string;
};

export function approxKrwFromSnapshot(
  amountUsdt: string,
  snapshot: { usdtKrw: string },
): string;

export function normalizeAssetMaster(input: {
  assetId: string;
  category: "watch" | "trading_card" | "luxury_bag";
  assetLabel: string;
  imageUrl: string;
  imageSource: "ebay" | "pokemontcg" | "ygoprodeck" | "admin_r2";
  imageAltKo?: string;
  imageFetchedAt?: string;
  meta?: object;
}): {
  assetId: string;
  category: string;
  assetLabel: string;
  imageUrl: string;
  imageSource: string;
  imageAltKo: string;
  imageRightsNoteKo: string;
  imageFetchedAt: string | null;
  meta: object;
};

export function isImageMissing(assetOrOpp: {
  imageUrl?: string | null;
}): boolean;

export const ASSET_ICON_BY_CATEGORY: Readonly<{
  watch: string;
  trading_card: string;
  luxury_bag: string;
}>;

export function assetIconForCategory(category: string): string;

export function assertCategoryImageSource(input: {
  category: string;
  imageSource: string;
}): { ok: boolean; reason?: string };

export function assertSkuImageOneToOne(input: {
  assetId: string;
  assetImageUrl: string;
  bindings?: Record<string, string>;
}): { ok: boolean; reason?: string };

export function resolveAssetImage(input: {
  assetId: string;
  category: "watch" | "trading_card" | "luxury_bag";
  assetLabel: string;
  assetMaster?: {
    imageUrl?: string;
    imageSource?: string;
    imageAltKo?: string;
    imageFetchedAt?: string;
  } | null;
  catalog?: {
    imageUrl?: string;
    imageSmall?: string;
    imageLarge?: string;
    imageSource?: "pokemontcg" | "ygoprodeck";
    family?: string;
  } | null;
  listing?: { imageUrl?: string } | null;
  skuBindings?: Record<string, string>;
}): {
  assetId: string;
  category: string;
  assetLabel: string;
  assetImageUrl: string;
  assetImageSource: string;
  assetImageAltKo: string;
  imageRightsNoteKo: string;
  assetIcon: string;
  imageMissing: boolean;
  imageFetchedAt: string | null;
  hydrateRank: number | null;
};

export function canAutoPublishAvailable(input: {
  compareReady: boolean;
  assetImageUrl?: string | null;
  useAdminOverride?: boolean;
  imageOptional?: boolean;
}): boolean;

export function assertPublishImageGuard(input: {
  compareReady: boolean;
  assetImageUrl?: string | null;
  useAdminOverride?: boolean;
  imageOptional?: boolean;
  category?: string;
  imageSource?: string;
  assetId?: string;
  skuBindings?: Record<string, string>;
}): { ok: boolean; fails: string[] };

export function toOpportunityImageProjection(resolved: {
  assetImageUrl: string;
  assetImageSource: string;
  assetImageAltKo: string;
  assetIcon: string;
  imageMissing: boolean;
  imageRightsNoteKo: string;
}): {
  assetImageUrl: string;
  assetImageSource: string;
  assetImageAltKo: string;
  assetIcon: string;
  imageMissing: boolean;
  imageRightsNoteKo: string;
};

export function resolveCapitalBand(requiredCapitalUsdt: string): string;
export function isCapitalBand(id: string): boolean;
export function capitalBandLabelKo(band: string): string;
export function capitalBandAtMost(band: string, maxBand: string): boolean;
export function tallyCapitalBands(
  input: Record<string, number> | Array<string | { capitalBand?: string }>,
): Record<string, number>;
export function assertCatalogSeedRatios(
  input: Record<string, number> | Array<string | { capitalBand?: string }>,
): {
  ok: boolean;
  total: number;
  counts: Record<string, number>;
  ratiosPct: { microSmall: number; mid: number; highWhale: number };
  fails: string[];
};
export function isForbiddenMarketId(marketId?: string | null): boolean;
export function assertNotForbidden(input: {
  marketId?: string;
  adapterId?: string;
  source?: string;
}): void;
export function feePctForMarket(
  marketId: string,
  feePct?: { ebay?: string; admin?: string },
): string;
export function withinTolerance(
  actual: string,
  expected: string,
  tolUsdt?: string,
): boolean;

export const SIGNUP_READY_ADAPTER_IDS: readonly [
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "coingecko",
  "frankfurter",
];
export const SIGNUP_READY_WORKER_NAMES: readonly [
  "ebay-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
];
export const EBAY_MARKETPLACE_IDS: readonly [
  "EBAY_US",
  "EBAY_GB",
  "EBAY_DE",
  "EBAY_AU",
];
export const EBAY_MARKETPLACE_TO_MARKET_ID: Readonly<Record<string, string>>;
export const SIGNUP_READY_ADAPTERS: ReadonlyArray<{
  adapterId: string;
  worker: string;
  role: "listing" | "catalog_ref" | "fx";
  verticals: string[];
  cacheHintSec: number;
}>;
export const DAY1_LEG_PAIRS: ReadonlyArray<{
  buy: string;
  sell: string;
  priority: string;
}>;
export function marketIdFromEbayMarketplace(marketplaceId: string): string;
export function isSignupReadyAdapterId(adapterId: string): boolean;
export function isForbiddenAdapterId(id?: string | null): boolean;

/** Engine §51.12 card grade */
export function normalizeGradeToken(value: string | null | undefined): string;
export function extractGradeFromText(text: string | null | undefined): {
  company: "PSA" | "BGS" | "CGC" | "SGC" | "raw" | null;
  grade: string | null;
  raw: boolean;
  normalized: string;
  found: boolean;
};
export function compareGradeDeclared(
  gradeDeclared: string | null | undefined,
  observed: {
    found: boolean;
    normalized: string;
  },
): { match: boolean; gradeMismatch: boolean; reason: string };
export function evaluateListingGradeMatch(input: {
  gradeDeclared?: string | null;
  listingTitle?: string | null;
  listingCaption?: string | null;
}): {
  gradeDeclared: string | null;
  observed: ReturnType<typeof extractGradeFromText>;
  gradeMismatch: boolean;
  match: boolean;
  reason: string;
};

/** trading_card match keys */
export function buildCardMatchKey(
  id: {
    set?: string;
    number?: string;
    lang?: string;
    finish?: string;
    gradeDeclared?: string;
    game?: string;
  },
  opts?: { includeGrade?: boolean },
): string;
export function matchCardIdentity(
  asset: Record<string, string | undefined>,
  candidate: Record<string, string | undefined>,
): { exact: boolean; fuzzy: boolean; missing: string[] };
export function evaluateCardListingMatch(input: {
  assetMeta: {
    set?: string;
    number?: string;
    lang?: string;
    finish?: string;
    gradeDeclared?: string;
    game?: string;
  };
  listingMeta?: Record<string, string | undefined>;
  listingTitle?: string;
  listingCaption?: string;
}): {
  identity: { exact: boolean; fuzzy: boolean; missing: string[] };
  grade: ReturnType<typeof evaluateListingGradeMatch>;
  gradeMismatch: boolean;
  fuzzyAloneForbidden: boolean;
  canAutoPublish: boolean;
  matchKey: string;
};
export function catalogSourceForGame(
  game: string,
): "pokemontcg" | "ygoprodeck" | null;

/** trading_card seed vertical */
export const TRADING_CARD_SEED_COUNT_LOCK: {
  readonly min: 20;
  readonly max: 40;
};
export const TRADING_CARD_MICRO_SMALL_MIN_PCT: 60;
export const TRADING_CARD_SEEDS: ReadonlyArray<{
  assetId: string;
  assetLabel: string;
  imageUrl: string;
  imageSource: "pokemontcg" | "ygoprodeck";
  requiredCapitalUsdt: string;
  meta: Record<string, unknown>;
}>;
export function listTradingCardSeeds(): typeof TRADING_CARD_SEEDS;
export function tradingCardSeedsAsAssetMasters(): ReturnType<
  typeof normalizeAssetMaster
>[];
export function tradingCardEbayQueries(): string[];
export function tradingCardPokemonQueries(): string[];
export function tradingCardYugiohNames(): string[];
export function assertTradingCardSeedInvariants(): {
  ok: boolean;
  fails: string[];
  counts: {
    total: number;
    pokemon: number;
    yugioh: number;
    microSmall: number;
    graded: number;
    microSmallPct: number;
  };
};

/** luxury_bag match keys · brand+model(+size/color) */
export function buildBagMatchKey(id: {
  brand?: string;
  model?: string;
  size?: string;
  color?: string;
}): string;
export function matchBagIdentity(
  asset: Record<string, string | undefined>,
  candidate: Record<string, string | undefined>,
): { exact: boolean; fuzzy: boolean; missing: string[] };
export function evaluateBagListingMatch(input: {
  assetMeta: {
    brand?: string;
    model?: string;
    size?: string;
    color?: string;
  };
  listingMeta?: Record<string, string | undefined>;
  listingTitle?: string;
}): {
  identity: { exact: boolean; fuzzy: boolean; missing: string[] };
  fuzzyAloneForbidden: boolean;
  canAutoPublish: boolean;
  matchKey: string;
};

/** luxury_bag seed vertical */
export const LUXURY_BAG_SEED_COUNT_LOCK: {
  readonly min: 10;
  readonly max: 25;
};
export const LUXURY_BAG_REQUIRED_BRANDS: readonly string[];
export const LUXURY_BAG_SEEDS: ReadonlyArray<{
  assetId: string;
  assetLabel: string;
  imageUrl: string;
  imageSource: "admin_r2";
  requiredCapitalUsdt: string;
  meta: Record<string, unknown>;
}>;
export function listLuxuryBagSeeds(): typeof LUXURY_BAG_SEEDS;
export function luxuryBagSeedsAsAssetMasters(): ReturnType<
  typeof normalizeAssetMaster
>[];
export function luxuryBagEbayQueries(): string[];
export function assertLuxuryBagSeedInvariants(): {
  ok: boolean;
  fails: string[];
  counts: {
    total: number;
    byBrand: Record<string, number>;
  };
};

/** watch match keys · brand+reference(+model) */
export function buildWatchMatchKey(id: {
  brand?: string;
  reference?: string;
  model?: string;
}): string;
export function matchWatchIdentity(
  asset: Record<string, string | undefined>,
  candidate: Record<string, string | undefined>,
): { exact: boolean; fuzzy: boolean; missing: string[] };
export function evaluateWatchListingMatch(input: {
  assetMeta: {
    brand?: string;
    reference?: string;
    model?: string;
  };
  listingMeta?: Record<string, string | undefined>;
  listingTitle?: string;
}): {
  identity: { exact: boolean; fuzzy: boolean; missing: string[] };
  fuzzyAloneForbidden: boolean;
  canAutoPublish: boolean;
  matchKey: string;
};

/** watch seed vertical · Ultra whale≥100k · Day-1 catalog coexistence */
export const WATCH_SEED_COUNT_LOCK: {
  readonly min: 40;
  readonly max: 80;
};
export const WATCH_REQUIRED_BRANDS: readonly string[];
export const WATCH_BRAND_TIER: Readonly<Record<string, "ultra" | "core" | "strong">>;
export const WHALE_MIN_REQUIRED_CAPITAL_USDT: "100000";
export const WATCH_SEEDS: ReadonlyArray<{
  assetId: string;
  assetLabel: string;
  imageUrl: string;
  imageSource: "admin_r2";
  requiredCapitalUsdt: string;
  meta: Record<string, unknown>;
}>;
export function listWatchSeeds(): typeof WATCH_SEEDS;
export function watchSeedsAsAssetMasters(): ReturnType<
  typeof normalizeAssetMaster
>[];
export function watchEbayQueries(): string[];
export function isWhaleCapitalPath(requiredCapitalUsdt: string): boolean;
export function isUltraWatchWhalePath(row: {
  meta?: { brandTier?: string };
  requiredCapitalUsdt?: string;
}): boolean;
export function listDay1CatalogSeedBands(): Array<{
  capitalBand: string;
  category: string;
  assetId: string;
}>;
export function assertDay1CatalogCoexistence(): ReturnType<
  typeof assertCatalogSeedRatios
>;
export function assertWatchSeedInvariants(): {
  ok: boolean;
  fails: string[];
  counts: {
    total: number;
    byBrand: Record<string, number>;
    byTier: Record<string, number>;
    byBand: Record<string, number>;
    whaleUltra: number;
    coexistence: ReturnType<typeof assertCatalogSeedRatios>;
  };
};

/** Engine §4.2a opportunity scan projection */
export const ARBITRAGE_TYPES: readonly [
  "price",
  "fx",
  "benefit",
  "limited",
  "resale",
];
export const ARBITRAGE_TYPE_LABEL_KO: Readonly<{
  price: "시세차익";
  fx: "환율차익";
  benefit: "혜택차익";
  limited: "한정차익";
  resale: "리셀차익";
}>;
export const V1_FEED_ARBITRAGE_TYPES: readonly ["price", "fx"];
export const DEFAULT_TIME_SENSITIVE_HORIZON_SEC: 7200;
export const SELL_SUCCESS_WINDOW_DAYS_DEFAULT: 30;
export const FX_USES_OPPORTUNITY_CARD_SCHEMA: true;
export const FX_CARD_SCHEMA_ID: "opportunity-card.v1";
export const FORBIDDEN_SEPARATE_FX_SCHEMA_NAMES: readonly string[];
export const OPPORTUNITY_CARD_TAGS: readonly [
  "instant",
  "high_profit",
  "ai_pick",
  "beginner",
  "time_sensitive",
];
export function isArbitrageType(type: string): boolean;
export function arbitrageTypeKo(arbitrageType: string): string;
export function isV1FeedArbitrageType(arbitrageType: string): boolean;
export function shouldTagTimeSensitive(input: {
  staleAt: string | Date | number;
  now?: string | Date | number;
  forceTimeSensitive?: boolean;
  timeSensitiveHorizonSec?: number;
}): boolean;
export function withTimeSensitiveTag(
  tags: string[] | null | undefined,
  opts: {
    staleAt: string | Date | number;
    now?: string | Date | number;
    forceTimeSensitive?: boolean;
    timeSensitiveHorizonSec?: number;
  },
): string[];
export function projectSellSuccessMeta(input: {
  sellSuccessRate?: number | null;
  sellSuccessWindowDays?: number | null;
  sellSuccessAsOf?: string | null;
}): {
  sellSuccessRate?: number;
  sellSuccessWindowDays?: number;
  sellSuccessAsOf?: string;
};
export function projectOpportunityScanFields(input: {
  arbitrageType: string;
  tags?: string[] | null;
  staleAt: string | Date | number;
  now?: string | Date | number;
  forceTimeSensitive?: boolean;
  timeSensitiveHorizonSec?: number;
  sellSuccessRate?: number | null;
  sellSuccessWindowDays?: number | null;
  sellSuccessAsOf?: string | null;
}): {
  arbitrageType: string;
  arbitrageTypeKo: string;
  tags: string[];
  sellSuccessRate?: number;
  sellSuccessWindowDays?: number;
  sellSuccessAsOf?: string;
};
export function assertAvailableScanProjection(card: {
  id?: string;
  status?: string;
  arbitrageType?: string;
  arbitrageTypeKo?: string;
  executionMode?: string;
  compareReady?: boolean;
}): { ok: boolean; fails: string[] };
export function assertAvailableCardsArbitrageTypeKo(
  cards: Array<object>,
): { ok: boolean; fails: string[]; checked: number };
export function assertFxUsesSameCardSchema(): {
  ok: boolean;
  fails: string[];
};

/** Engine §4.2b — capital provider USER projection */
export const AUDIENCE_USER: "user";
export const AUDIENCE_ADMIN: "admin";
export const INTERNAL_TO_USER_FIELD: Readonly<
  Record<
    string,
    {
      internalUse: string;
      userExposure: string;
      userCopyHint: string;
      forbiddenHints: readonly string[];
      userSurface: "expose" | "strip" | "label_only" | "fact_optional";
    }
  >
>;
export const USER_SURFACE_STRIP_KEYS: readonly string[];
export const WAITING_FACT_SOURCES: readonly string[];
export const USER_BANNED_TRADER_JARGON: readonly string[];
export const USER_BANNED_PRIMARY_CTA: readonly string[];
export function isWaitingFactSource(source: unknown): boolean;
export function projectWaitingFacts(input: {
  matchWaitersCount?: number | null;
  matchableOpportunityCount?: number | null;
  factSource?: string | null;
}): {
  matchWaitersCount?: number;
  matchableOpportunityCount?: number;
  waitingFactSource?: string;
};
export function userExecutionModeHint(
  executionMode?: string | null,
): string;
export function projectCapitalProviderUserSurface(
  card: Record<string, unknown> | null | undefined,
  opts?: {
    audience?: "user" | "admin";
    matchWaitersCount?: number | null;
    matchableOpportunityCount?: number | null;
    factSource?: string | null;
  },
): Record<string, unknown>;
export function assertUserSurfaceCapitalProvider(
  payload: unknown,
  opts?: { audience?: "user" | "admin"; path?: string },
): { ok: boolean; fails: string[] };
export function assertCapitalProviderProjectionInvariants(): {
  ok: boolean;
  fails: string[];
};

/** Engine §0.0.5.1 — balance-aware feed */
export const CLASSIFICATION_OWNER: "engine:§0.0.5.1";
export const FEED_BUCKETS: readonly ["affordable", "nearMiss", "lockedHigh"];
export const SUGGEST_TICK_USDT: "1";
export const NEAR_MISS_CAP_FLOOR_USDT: "50";
export const NEAR_MISS_CAP_PRINCIPAL_PCT: "0.25";
export const BUCKET_RANK: Readonly<{
  affordable: 0;
  nearMiss: 1;
  lockedHigh: 2;
}>;
export function ceilToTick(amountUsdt: string, tickUsdt?: string): string;
export function computeSuggestDepositUsdt(
  requiredCapitalUsdt: string,
  principalUsdt: string,
): string;
export function resolveNearMissCapUsdt(
  principalUsdt: string,
  policyNearMissCapUsdt?: string | null,
): string;
export function classifyAffordability(input: {
  principalUsdt: string;
  requiredCapitalUsdt: string;
  nearMissCapUsdt: string;
  forceShow?: boolean;
}): {
  bucket: "affordable" | "nearMiss" | "lockedHigh";
  suggestDepositUsdt: string;
  forceShowPromoted: boolean;
};
export function compareBalanceAwareFeedItems(
  a: object,
  b: object,
  ctx?: { principalUsdt?: string },
): number;
export function projectBalanceAwareCard(
  card: object,
  ctx: { principalUsdt: string; nearMissCapUsdt: string },
): object;
export function buildBalanceAwareFeed(input: {
  principalUsdt: string;
  cards: Array<object>;
  policyNearMissCapUsdt?: string | null;
}): {
  principalUsdt: string;
  nearMissCapUsdt: string;
  classificationOwner: "engine:§0.0.5.1";
  items: Array<object>;
  affordableCount: number;
  nearMissCount: number;
  lockedHighCount: number;
  hiddenCount: number;
  topSuggestDepositUsdt: string | null;
};
export function nearMissCapFromExecutionPolicy(
  policy: object | null | undefined,
): string | null;

/** Engine §48.13.3 matchStrictness → Rule map */
export const SOFT_SEC: 60;
export const HARD_SEC: 90;
export const MATCH_STRICTNESS_ENUM: ReadonlyArray<
  "lenient" | "standard" | "tight" | "scarce" | "custom"
>;
export const MATCH_STRICTNESS_PRESETS: Readonly<{
  lenient: MatchStrictnessMappedFields;
  standard: MatchStrictnessMappedFields;
  tight: MatchStrictnessMappedFields;
  scarce: MatchStrictnessMappedFields;
}>;
export const MATCH_STRICTNESS_PRESET_SNAPSHOT: string;
export const DAY1_RETRY_WAIT_SEC: 4;
export const DAY1_PRESENTATION: {
  durationSecMin: number;
  durationSecMax: number;
  steps: ReadonlyArray<string>;
};
export const DAY1_FEED: { nearMissCapUsdt: string };
/** Nil UUID sentinel for execution_policies seed / Nest ensure */
export const EXECUTION_POLICY_BOOTSTRAP_ADMIN_ID: "00000000-0000-0000-0000-000000000000";
export type MatchStrictnessMappedFields = {
  minProfitUsdt: string;
  staleAllowanceSec: number;
  maxRematchCount: number;
  slippageBoundBps: number;
  dailyUserMatchCap: number;
  dailyOppSlotsDefault: number;
};
export function isPresetStrictness(v: unknown): boolean;
export function isMatchStrictness(v: unknown): boolean;
export function presetSnapshotCanonical(): string;
export function assertPresetSnapshot(): true;
export function expandMatchStrictness(
  matchStrictness: string,
): MatchStrictnessMappedFields | null;
export function applyMatchStrictness(input: {
  matchStrictness: string;
  minProfitUsdt?: string;
  staleAllowanceSec?: number;
  maxRematchCount?: number;
  slippageBoundBps?: number;
  dailyUserMatchCap?: number;
  dailyOppSlotsDefault?: number;
}): { matchStrictness: string } & MatchStrictnessMappedFields;
export function coerceStrictnessLabel(fields: {
  matchStrictness?: string;
  minProfitUsdt?: string;
  staleAllowanceSec?: number;
  maxRematchCount?: number;
  slippageBoundBps?: number;
  dailyUserMatchCap?: number;
  dailyOppSlotsDefault?: number;
}): "lenient" | "standard" | "tight" | "scarce" | "custom";
export function day1ExecutionPolicyDefaults(updatedByAdminId?: string): object;
export function assertDay1BootstrapShape(policy: object): true;
export function softHardReadOnly(): {
  softSec: 60;
  hardSec: 90;
  membershipUniform: true;
};
export function toRulePolicy(policy: object): {
  minProfitUsdt: string;
  staleAllowanceSec: number;
  maxRematchCount: number;
  retryWaitSec: number;
};

/** Engine §0.0.7 membership ladder · daily cap · overlay · fulfillRate display-only */
export const MEMBERSHIP_ENUM: ReadonlyArray<
  "sprout" | "entry" | "core" | "high" | "vip"
>;
export const MEMBERSHIP_RANK: Readonly<{
  sprout: 0;
  entry: 1;
  core: 2;
  high: 3;
  vip: 4;
}>;
export const MEMBERSHIP_LABEL_KO: Readonly<Record<string, string>>;
export const MEMBERSHIP_LADDER: Readonly<
  Record<
    string,
    {
      depositMinUsdt: string;
      successMin: number | null;
      maxCapitalBand: string;
      dailyUserMatchCap: number;
      matchStrictness: "lenient" | "standard" | "tight" | "scarce";
      aiPerkFlags: ReadonlyArray<string>;
      labelKo: string;
    }
  >
>;
export const MEMBERSHIP_BAND_OVERLAY: Readonly<
  Record<string, Readonly<Record<string, string>>>
>;
export const MEMBERSHIP_LADDER_SNAPSHOT: string;
export const MEMBERSHIP_BAND_OVERLAY_SNAPSHOT: string;
export function isMembership(v: unknown): boolean;
export function membershipLabelKo(membership: string): string;
export function membershipDefaults(membership: string): {
  membership: string;
  maxCapitalBand: string;
  dailyUserMatchCap: number;
  matchStrictness: string;
  aiPerkFlags: string[];
  labelKo: string;
};
export function membershipFromDeposit(cumulativeDepositUsdt: string): string;
export function membershipFromSuccess(matchSuccessCount: number): string;
export function maxMembership(a: string, b: string): string;
export function resolveMembership(input: {
  cumulativeDepositUsdt: string;
  matchSuccessCount: number;
  adminForce?: boolean;
  forcedMembership?: string | null;
}): {
  membership: string;
  adminForce: boolean;
  autoMembership: string;
  fromDeposit: string;
  fromSuccess: string;
};
export function projectUserMembership(input: {
  userId?: string;
  cumulativeDepositUsdt: string;
  matchSuccessCount: number;
  adminForce?: boolean;
  forcedMembership?: string | null;
  dailyMatchesUsed?: number;
  fulfillRate7d?: number;
  updatedAt?: string;
}): object;
export function membershipBandOverlayStrictness(
  membership: string,
  capitalBand: string,
): string;
export function mergeEffectivePolicy(input: {
  basePolicy: object;
  membership: string;
  capitalBand: string;
  membershipBandOverlayEnabled?: boolean;
  userOverride?: object | null;
  fulfillRate7d?: never;
}): object;
export function checkParticipateMembershipGuards(input: {
  opportunityCapitalBand: string;
  maxCapitalBand: string;
  dailyMatchesUsed: number;
  dailyUserMatchCap: number;
  slotsLeft: number;
}): null | { code: string; message: string };
export function computeFulfillRate7d(counts: {
  matchSuccess: number;
  priceMoved: number;
  belowMinProfit: number;
  requeueTerminal?: number;
}): number | null;
export function ladderSnapshotCanonical(): string;
export function overlaySnapshotCanonical(): string;
export function assertMembershipSnapshots(): true;
export function toRulePolicyFromEffective(effectivePolicy: object): {
  minProfitUsdt: string;
  staleAllowanceSec: number;
  maxRematchCount: number;
  retryWaitSec: number;
};

/** Engine §51.12 + §51.15 adapter matching KPI · Simulation S4 input */
export const KPI_THRESHOLDS: Readonly<{
  skuMatchFailRateMax: number;
  compareReadyFalseRatioMax: number;
  windowHours: number;
  s4AdapterMatchFailureRateMax: number;
}>;
export const DAY1_AUTO_PUBLISH_YAHOO_JP: false;
export function evaluateSkuMatchAttempt(input: {
  category: string;
  assetMeta: object;
  listingMeta?: object;
  listingTitle?: string;
  listingCaption?: string;
  adapterId?: string;
  at?: string;
}): {
  adapterId: string;
  category: string;
  matched: boolean;
  reason: string;
  gradeMismatch: boolean;
  at: string;
  canAutoPublish: boolean;
  detail: object;
};
export function computeSkuMatchFailureRate(
  attempts: Array<{
    adapterId?: string;
    matched: boolean;
    gradeMismatch?: boolean;
    reason?: string;
    at?: string | number | Date;
  }>,
  opts?: { now?: number | string | Date; windowHours?: number; adapterId?: string },
): {
  rate: number;
  attempts: number;
  failures: number;
  gradeMismatchCount: number;
};
export function computeCompareReadyFalseRatio(
  items: Array<{ compareReady?: boolean }>,
): { rate: number; total: number; falseCount: number };
export function evaluateStaleListings(
  listings: Array<{
    adapterId?: string;
    staleAt?: string | Date | number;
    id?: string;
  }>,
  opts?: { now?: number | string | Date },
): {
  staleCount: number;
  byAdapter: Record<string, number>;
  staleListingIds: string[];
  anyAdapterRed: boolean;
};
export function evaluateAdapterMatchingKpi(input?: {
  attempts?: Array<{
    adapterId?: string;
    matched: boolean;
    gradeMismatch?: boolean;
    reason?: string;
    at?: string | number | Date;
  }>;
  catalog?: Array<{ compareReady?: boolean }>;
  listings?: Array<{
    adapterId?: string;
    staleAt?: string | Date | number;
    id?: string;
  }>;
  adapterId?: string;
  now?: number | string | Date;
}): {
  thresholds: typeof KPI_THRESHOLDS;
  windowHours: number;
  skuMatchFailureRate: number;
  skuAttempts: number;
  skuFailures: number;
  gradeMismatchCount: number;
  compareReadyFalseRatio: number;
  compareReadyFalseCount: number;
  catalogTotal: number;
  stale: ReturnType<typeof evaluateStaleListings>;
  alerts: Array<{
    kind: "sku_match_fail" | "compare_ready_false" | "stale_listing";
    messageKo: string;
    severity: "yellow" | "red";
    adapterId?: string;
  }>;
  reduceAutoPublish: boolean;
  seedReviewQueue: boolean;
  hideStaleOpps: boolean;
  top2Red: boolean;
  adapterMatchFailureRate: number;
  day1AutoPublishYahooJp: false;
};
export function evaluateSimulationS4(adapterMatchFailureRate: number): {
  pass: boolean;
  threshold: number;
  rate: number;
  failAction: "adapter_alert";
};
export function simulationS4InputFromKpi(
  kpi: ReturnType<typeof evaluateAdapterMatchingKpi>,
): {
  adapterMatchFailureRate: number;
  s4: ReturnType<typeof evaluateSimulationS4>;
};
export function healthStatusFromKpi(
  kpi: ReturnType<typeof evaluateAdapterMatchingKpi>,
  adapterId?: string,
): "green" | "yellow" | "red" | "unknown";

/** Engine §0.9 E-R6 catalog runtime seed · ebay ingest shape · Day-1 ebay|admin */
export const DAY1_FX_SNAPSHOT_ID: "fx_day1_runtime_seed";
export const DAY1_USDT_KRW: string;
export const LISTING_STALE_SEC: number;
export const FORBIDDEN_INGEST_ADAPTERS: ReadonlyArray<"amazon" | "yahoo_jp">;
export const MARKETPLACE_BY_MARKET: Readonly<Record<string, string>>;
export function day1FxSnapshot(capturedAt?: string): ReturnType<
  typeof composeFxSnapshot
>;
export function listDay1AssetMasters(): Array<{
  assetId: string;
  category: "watch" | "trading_card" | "luxury_bag";
  assetLabel: string;
  imageUrl: string;
  imageSource: string;
  imageAltKo: string;
  imageRightsNoteKo: string;
  imageFetchedAt: string | null;
  meta: Record<string, unknown>;
}>;
export function assertDay1ListingLeg(input: {
  adapterId?: string;
  marketId?: string;
}): void;
export function buildEbayIngestListing(input: {
  assetId: string;
  marketId: "ebay_us" | "ebay_gb" | "ebay_de" | "ebay_au";
  priceUsdt: string;
  title: string;
  imageUrl?: string;
  observedAt?: string;
}): Record<string, unknown>;
export function buildRuntimeSeedBundleForAsset(
  asset: {
    assetId: string;
    category: string;
    assetLabel: string;
    imageUrl: string;
    imageSource: string;
    imageAltKo?: string;
    meta?: { requiredCapitalUsdt?: string };
  },
  opts?: { compareReadyForceFalse?: boolean; observedAt?: string },
): {
  listings: Array<Record<string, unknown>>;
  opportunity: Record<string, unknown>;
  publishGuard: { canPublish: boolean; imageGuard: { ok: boolean; fails: string[] } };
};
export function buildMinCatalogRuntimeSeed(opts?: { observedAt?: string }): {
  fx: ReturnType<typeof composeFxSnapshot>;
  assets: ReturnType<typeof listDay1AssetMasters>;
  bundles: Array<ReturnType<typeof buildRuntimeSeedBundleForAsset>>;
  day1LegPair: { buy: string; sell: string };
  forbiddenInsertAttempts: string[];
};
export function normalizeIngestListingsForPersist(
  rawListings: unknown[],
  adapterId: string,
): Array<{
  assetId: string;
  marketId: string;
  adapterId: string;
  marketplaceId: string | null;
  externalItemId: string | null;
  title: string | null;
  priceUsdt: string;
  currency: string;
  url: string | null;
  imageUrl: string | null;
  observedAt: string;
  staleAt: string;
  raw: Record<string, unknown>;
}>;

/** Engine §0.10 — ebay identity match */
export const EBAY_IMAGE_HOST: "i.ebayimg.com";
export function isEbayImageHost(url: string | null | undefined): boolean;
export function extractSearchQuery(listing: Record<string, unknown>): string;
export function resolveEbayIngestListings(input: {
  listings: unknown[];
  masters?: unknown[];
  now?: string;
}): {
  matched: Array<Record<string, unknown>>;
  unmatched: Array<Record<string, unknown>>;
  matchAttempts: Array<{
    adapterId: string;
    category?: string;
    matched: boolean;
    reason?: string;
    gradeMismatch?: boolean;
    at: string;
  }>;
  stats: { input: number; matched: number; unmatched: number };
};
export function assertNoQueryAssetIds(rows: unknown[]): true;
export function buildUnmatchedEvidence(
  listing: Record<string, unknown>,
  reason: string,
  extra?: Record<string, unknown>,
): Record<string, unknown>;

/** Engine v7.23 R1 — HomeReadModelV1 */
export const HOME_VIEW_STATES: readonly string[];
export const HOME_VIEW_STATES_SERVER: readonly string[];
export const TODAY_POSSIBLE_DERIVATION_ID: string;
export const FORBIDDEN_FAKE_KEYS: readonly string[];
export function deriveTodayPossibleProfitUsdt(items: unknown[]): string;
export function composeViewState(parts: string[]): string;
export function mapHomeReadModelV1(
  input: Record<string, unknown>,
): Record<string, unknown>;
export function assertNoFakeZeroHomeRead(dto: Record<string, unknown>): true;
