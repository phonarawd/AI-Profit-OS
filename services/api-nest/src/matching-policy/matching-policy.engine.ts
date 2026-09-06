/**
 * S3 / B7 유저별 상품 노출·참여 정책. 서버 권위. 클라이언트 필터 금지.
 * 매칭 수익 장부·SYS:OPPORTUNITY_POOL 과 다른 층. 금액·journal 조작 0.
 */

export const USER_POLICY_UNAVAILABLE =
  "현재 계정에서 이용할 수 없는 상품입니다.";
export const USER_POLICY_UNAVAILABLE_HINT =
  "이용 가능한 다른 상품을 확인해 주세요.";
export const USER_POLICY_EMPTY = "지금 이용할 수 있는 상품이 없습니다";

export const PLATFORM_DEFAULT_POLICY_ID = "platform-default";

export type PolicySource = "platform" | "group" | "user";

export type MatchingPolicyLayer = {
  source: PolicySource;
  policyId: string;
  version: number;
  visibilityMinUsdt: string | null;
  visibilityMaxUsdt: string | null;
  participateMinUsdt: string | null;
  participateMaxUsdt: string | null;
  allowCategories: string[] | null;
  denyCategories: string[] | null;
  allowBrands: string[] | null;
  denyBrands: string[] | null;
  allowProviders: string[] | null;
  denyProviders: string[] | null;
  allowMarketplaces: string[] | null;
  denyMarketplaces: string[] | null;
  allowCountries: string[] | null;
  denyCountries: string[] | null;
  allowCurrencies: string[] | null;
  denyCurrencies: string[] | null;
  includeOpportunityIds: string[];
  excludeOpportunityIds: string[];
  autoMatchAllowed: boolean | null;
  manualAssignOnly: boolean | null;
  preferNewListings: boolean | null;
  maxConcurrentTrades: number | null;
  dailyParticipateCount: number | null;
  dailyParticipateAmountUsdt: string | null;
  matchingPaused: boolean | null;
  effectiveFromMs: number | null;
  effectiveUntilMs: number | null;
};

export type OpportunityCandidate = {
  id: string;
  requiredCapitalUsdt: string;
  category: string;
  brand: string | null;
  model: string | null;
  condition: string | null;
  provider: string | null;
  marketplace: string | null;
  country: string | null;
  currency: string | null;
  status: string;
  published: boolean;
  expired: boolean;
  identityConfirmed: boolean;
  amountValid: boolean;
};

export type MatchingUserContext = {
  userId: string;
  platformHardStop: boolean;
  accountBlocked: boolean;
  riskBlocked: boolean;
  activeTradeCount: number;
  dailyParticipateCount: number;
  dailyParticipateAmountUsdt: string;
  nowMs: number;
};

export type MatchingDecision = {
  visible: boolean;
  participable: boolean;
  reasonCode: string;
  source: PolicySource;
  policyId: string;
  policyVersion: number;
  visibilityMinUsdt: string | null;
  visibilityMaxUsdt: string | null;
};

export type EffectivePolicy = MatchingPolicyLayer & {
  source: PolicySource;
};

const SCALE = 18;
const FORBIDDEN_ASSIGN_KEYS = [
  "sourcePrice",
  "fxSnapshot",
  "requiredCapitalUsdt",
  "expectedProfit",
  "expectedProfitUsdt",
  "settledProfitUsdt",
  "journal",
  "onchain",
  "success",
  "principalReturn",
] as const;

export function platformDefaultLayer(): MatchingPolicyLayer {
  return {
    source: "platform",
    policyId: PLATFORM_DEFAULT_POLICY_ID,
    version: 0,
    visibilityMinUsdt: null,
    visibilityMaxUsdt: null,
    participateMinUsdt: null,
    participateMaxUsdt: null,
    allowCategories: null,
    denyCategories: null,
    allowBrands: null,
    denyBrands: null,
    allowProviders: null,
    denyProviders: null,
    allowMarketplaces: null,
    denyMarketplaces: null,
    allowCountries: null,
    denyCountries: null,
    allowCurrencies: null,
    denyCurrencies: null,
    includeOpportunityIds: [],
    excludeOpportunityIds: [],
    autoMatchAllowed: true,
    manualAssignOnly: false,
    preferNewListings: false,
    maxConcurrentTrades: null,
    dailyParticipateCount: null,
    dailyParticipateAmountUsdt: null,
    matchingPaused: false,
    effectiveFromMs: null,
    effectiveUntilMs: null,
  };
}

export function isLayerActive(
  layer: MatchingPolicyLayer,
  nowMs: number,
): boolean {
  if (layer.effectiveFromMs != null && nowMs < layer.effectiveFromMs) {
    return false;
  }
  if (layer.effectiveUntilMs != null && nowMs >= layer.effectiveUntilMs) {
    return false;
  }
  return true;
}

function parseUsdt(raw: string): bigint {
  const s = String(raw ?? "");
  if (!/^-?[0-9]+(\.[0-9]+)?$/.test(s)) {
    throw new Error("invalid amount");
  }
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [whole, frac = ""] = body.split(".");
  if (frac.length > SCALE) throw new Error("amount scale");
  const padded = (frac + "0".repeat(SCALE)).slice(0, SCALE);
  const n = BigInt(whole + padded);
  return neg ? -n : n;
}

export function cmpUsdt(a: string, b: string): number {
  const d = parseUsdt(a) - parseUsdt(b);
  if (d < 0n) return -1;
  if (d > 0n) return 1;
  return 0;
}

function maxUsdt(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return cmpUsdt(a, b) >= 0 ? a : b;
}

function minUsdt(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return cmpUsdt(a, b) <= 0 ? a : b;
}

function inRange(
  amount: string,
  min: string | null,
  max: string | null,
): boolean {
  if (min != null && cmpUsdt(amount, min) < 0) return false;
  if (max != null && cmpUsdt(amount, max) > 0) return false;
  return true;
}

function uniq(list: string[]): string[] {
  return [...new Set(list.filter((x) => typeof x === "string" && x.length > 0))];
}

function lastNonNull<T>(layers: MatchingPolicyLayer[], pick: (l: MatchingPolicyLayer) => T | null): T | null {
  let out: T | null = null;
  for (const layer of layers) {
    const v = pick(layer);
    if (v != null) out = v;
  }
  return out;
}

function unionLists(
  layers: MatchingPolicyLayer[],
  pick: (l: MatchingPolicyLayer) => string[] | null | undefined,
): string[] {
  const out: string[] = [];
  for (const layer of layers) {
    const v = pick(layer);
    if (Array.isArray(v)) out.push(...v);
  }
  return uniq(out);
}

const SOURCE_RANK: Record<PolicySource, number> = {
  platform: 0,
  group: 1,
  user: 2,
};

export function mergeLayers(
  layers: MatchingPolicyLayer[],
  nowMs: number,
): EffectivePolicy {
  const active = [
    platformDefaultLayer(),
    ...layers.filter((layer) => isLayerActive(layer, nowMs)),
  ].sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source]);

  const top = active[active.length - 1] ?? platformDefaultLayer();
  let visibilityMin: string | null = null;
  let visibilityMax: string | null = null;
  let participateMin: string | null = null;
  let participateMax: string | null = null;
  for (const layer of active) {
    visibilityMin = maxUsdt(visibilityMin, layer.visibilityMinUsdt);
    visibilityMax = minUsdt(visibilityMax, layer.visibilityMaxUsdt);
    participateMin = maxUsdt(participateMin, layer.participateMinUsdt);
    participateMax = minUsdt(participateMax, layer.participateMaxUsdt);
  }

  return {
    ...platformDefaultLayer(),
    source: top.source,
    policyId: top.policyId,
    version: top.version,
    visibilityMinUsdt: visibilityMin,
    visibilityMaxUsdt: visibilityMax,
    participateMinUsdt: participateMin,
    participateMaxUsdt: participateMax,
    allowCategories: lastNonNull(active, (l) => l.allowCategories),
    denyCategories: unionLists(active, (l) => l.denyCategories),
    allowBrands: lastNonNull(active, (l) => l.allowBrands),
    denyBrands: unionLists(active, (l) => l.denyBrands),
    allowProviders: lastNonNull(active, (l) => l.allowProviders),
    denyProviders: unionLists(active, (l) => l.denyProviders),
    allowMarketplaces: lastNonNull(active, (l) => l.allowMarketplaces),
    denyMarketplaces: unionLists(active, (l) => l.denyMarketplaces),
    allowCountries: lastNonNull(active, (l) => l.allowCountries),
    denyCountries: unionLists(active, (l) => l.denyCountries),
    allowCurrencies: lastNonNull(active, (l) => l.allowCurrencies),
    denyCurrencies: unionLists(active, (l) => l.denyCurrencies),
    includeOpportunityIds: unionLists(active, (l) => l.includeOpportunityIds),
    excludeOpportunityIds: unionLists(active, (l) => l.excludeOpportunityIds),
    autoMatchAllowed: active.every((l) => l.autoMatchAllowed !== false),
    manualAssignOnly: active.some((l) => l.manualAssignOnly === true),
    preferNewListings: lastNonNull(active, (l) =>
      l.preferNewListings == null ? null : l.preferNewListings,
    ),
    maxConcurrentTrades: lastNonNull(active, (l) => l.maxConcurrentTrades),
    dailyParticipateCount: lastNonNull(active, (l) => l.dailyParticipateCount),
    dailyParticipateAmountUsdt: lastNonNull(
      active,
      (l) => l.dailyParticipateAmountUsdt,
    ),
    matchingPaused: active.some((l) => l.matchingPaused === true),
    effectiveFromMs: null,
    effectiveUntilMs: null,
  };
}

function deny(
  effective: EffectivePolicy,
  reasonCode: string,
  visible: boolean,
  participable: boolean,
): MatchingDecision {
  return {
    visible,
    participable,
    reasonCode,
    source: effective.source,
    policyId: effective.policyId,
    policyVersion: effective.version,
    visibilityMinUsdt: effective.visibilityMinUsdt,
    visibilityMaxUsdt: effective.visibilityMaxUsdt,
  };
}

function listAllows(
  value: string | null,
  allow: string[] | null,
  denyList: string[] | null,
  included: boolean,
): boolean {
  if (value && denyList && denyList.includes(value)) return false;
  if (included) return true;
  if (allow && allow.length > 0) {
    return Boolean(value && allow.includes(value));
  }
  return true;
}

export function evaluateMatchingPolicy(input: {
  candidate: OpportunityCandidate;
  layers: MatchingPolicyLayer[];
  ctx: MatchingUserContext;
  /** 클라이언트가 보낸 정책은 무시한다. 인자로 받아도 사용 0. */
  clientPolicy?: unknown;
}): MatchingDecision {
  void input.clientPolicy;
  const effective = mergeLayers(input.layers, input.ctx.nowMs);
  const c = input.candidate;

  if (input.ctx.platformHardStop) {
    return deny(effective, "platform_hard_stop", false, false);
  }
  if (input.ctx.accountBlocked || input.ctx.riskBlocked) {
    return deny(effective, "account_or_risk_blocked", false, false);
  }
  if (!c.published || c.expired || !c.identityConfirmed || !c.amountValid) {
    return deny(effective, "platform_default_reject", false, false);
  }
  if (c.status !== "available") {
    return deny(effective, "not_available", false, false);
  }
  if (effective.matchingPaused) {
    return deny(effective, "matching_paused", false, false);
  }

  const excluded = effective.excludeOpportunityIds.includes(c.id);
  if (excluded) {
    return deny(effective, "explicit_exclude", false, false);
  }
  const included = effective.includeOpportunityIds.includes(c.id);

  if (
    !listAllows(c.category, effective.allowCategories, effective.denyCategories, included)
  ) {
    return deny(effective, "category_denied", false, false);
  }
  if (!listAllows(c.brand, effective.allowBrands, effective.denyBrands, included)) {
    return deny(effective, "brand_denied", false, false);
  }
  if (
    !listAllows(c.provider, effective.allowProviders, effective.denyProviders, included)
  ) {
    return deny(effective, "provider_denied", false, false);
  }
  if (
    !listAllows(
      c.marketplace,
      effective.allowMarketplaces,
      effective.denyMarketplaces,
      included,
    )
  ) {
    return deny(effective, "marketplace_denied", false, false);
  }
  if (
    !listAllows(c.country, effective.allowCountries, effective.denyCountries, included)
  ) {
    return deny(effective, "country_denied", false, false);
  }
  if (
    !listAllows(
      c.currency,
      effective.allowCurrencies,
      effective.denyCurrencies,
      included,
    )
  ) {
    return deny(effective, "currency_denied", false, false);
  }

  if (
    !inRange(c.requiredCapitalUsdt, effective.visibilityMinUsdt, effective.visibilityMaxUsdt)
  ) {
    return deny(effective, "visibility_range", false, false);
  }

  let participable = true;
  let reasonCode = "allow";
  if (
    !inRange(
      c.requiredCapitalUsdt,
      effective.participateMinUsdt,
      effective.participateMaxUsdt,
    )
  ) {
    participable = false;
    reasonCode = "participate_range";
  }
  if (
    effective.maxConcurrentTrades != null &&
    input.ctx.activeTradeCount >= effective.maxConcurrentTrades
  ) {
    participable = false;
    reasonCode = "concurrent_cap";
  }
  if (
    effective.dailyParticipateCount != null &&
    input.ctx.dailyParticipateCount >= effective.dailyParticipateCount
  ) {
    participable = false;
    reasonCode = "daily_count_cap";
  }
  if (effective.dailyParticipateAmountUsdt != null) {
    try {
      const next = parseUsdt(input.ctx.dailyParticipateAmountUsdt) + parseUsdt(c.requiredCapitalUsdt);
      if (next > parseUsdt(effective.dailyParticipateAmountUsdt)) {
        participable = false;
        reasonCode = "daily_amount_cap";
      }
    } catch {
      participable = false;
      reasonCode = "daily_amount_cap";
    }
  }

  return {
    visible: true,
    participable,
    reasonCode,
    source: effective.source,
    policyId: effective.policyId,
    policyVersion: effective.version,
    visibilityMinUsdt: effective.visibilityMinUsdt,
    visibilityMaxUsdt: effective.visibilityMaxUsdt,
  };
}

export function filterVisibleOpportunities(
  candidates: OpportunityCandidate[],
  layers: MatchingPolicyLayer[],
  ctx: MatchingUserContext,
): OpportunityCandidate[] {
  return candidates.filter(
    (candidate) =>
      evaluateMatchingPolicy({ candidate, layers, ctx }).visible,
  );
}

export function previewPolicyChange(input: {
  beforeLayers: MatchingPolicyLayer[];
  afterLayers: MatchingPolicyLayer[];
  candidates: OpportunityCandidate[];
  ctx: MatchingUserContext;
}): {
  beforeCount: number;
  afterCount: number;
  addedIds: string[];
  removedIds: string[];
} {
  const before = new Set(
    filterVisibleOpportunities(input.candidates, input.beforeLayers, input.ctx).map(
      (c) => c.id,
    ),
  );
  const after = new Set(
    filterVisibleOpportunities(input.candidates, input.afterLayers, input.ctx).map(
      (c) => c.id,
    ),
  );
  return {
    beforeCount: before.size,
    afterCount: after.size,
    addedIds: [...after].filter((id) => !before.has(id)),
    removedIds: [...before].filter((id) => !after.has(id)),
  };
}

export function assertManualAssignDoesNotMutateMoney(
  patch: Record<string, unknown>,
): { ok: true } | { ok: false; code: "ASSIGN_MONEY_MUTATION_FORBIDDEN" } {
  for (const key of FORBIDDEN_ASSIGN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      return { ok: false, code: "ASSIGN_MONEY_MUTATION_FORBIDDEN" };
    }
  }
  return { ok: true };
}

export function planBulkApply(input: {
  dryRunTargetCount: number;
  applyTargetCount: number;
  requestId: string;
  seenRequestId: string | null;
  currentVersion: number;
}):
  | { ok: true; version: number; duplicate: boolean }
  | { ok: false; code: "BULK_DRY_RUN_MISMATCH" } {
  if (input.dryRunTargetCount !== input.applyTargetCount) {
    return { ok: false, code: "BULK_DRY_RUN_MISMATCH" };
  }
  if (input.seenRequestId && input.seenRequestId === input.requestId) {
    return { ok: true, version: input.currentVersion, duplicate: true };
  }
  return { ok: true, version: input.currentVersion + 1, duplicate: false };
}

export function snapshotDoesNotRewrite(
  before: { requiredCapitalUsdt: string; expectedProfitUsdt: string },
  after: { requiredCapitalUsdt: string; expectedProfitUsdt: string },
): boolean {
  return (
    before.requiredCapitalUsdt === after.requiredCapitalUsdt &&
    before.expectedProfitUsdt === after.expectedProfitUsdt
  );
}
