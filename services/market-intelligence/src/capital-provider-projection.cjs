/**
 * Engine §4.2b — INTERNAL field ↔ USER surface (capital provider ≠ trader)
 * Owns: field meaning · public scope · strip/guards
 * UI Owns: pixel/CTA copy · Index §20.2 Owns role model
 * CI: verify:user-trader-jargon-0
 */

/** Audience for projection / assert */
const AUDIENCE_USER = "user";
const AUDIENCE_ADMIN = "admin";

/**
 * INTERNAL → USER interpretation map (영문 필드명 유지 · 유저 해석만 분리).
 * @type {Readonly<Record<string, {
 *   internalUse: string,
 *   userExposure: string,
 *   userCopyHint: string,
 *   forbiddenHints: readonly string[],
 *   userSurface: 'expose'|'strip'|'label_only'|'fact_optional',
 * }>>}
 */
const INTERNAL_TO_USER_FIELD = Object.freeze({
  buyPriceUsdt: {
    internalUse: "기회 산출·Admin",
    userExposure: "PriceCompare 저가 시세",
    userCopyHint: "저가 시세",
    forbiddenHints: Object.freeze(["매입가", "사세요", "매수하세요"]),
    userSurface: "expose",
  },
  sellPriceUsdt: {
    internalUse: "기회 산출·Admin",
    userExposure: "PriceCompare 고가 시세",
    userCopyHint: "고가 시세",
    forbiddenHints: Object.freeze(["판매가", "파세요", "매도하세요"]),
    userSurface: "expose",
  },
  buyMarketId: {
    internalUse: "adapter 레그",
    userExposure: "회랑 라벨·근거 블록",
    userCopyHint: "buyMarketLabelKo",
    forbiddenHints: Object.freeze(["마켓 선택", "구매처 선택"]),
    userSurface: "expose",
  },
  sellMarketId: {
    internalUse: "adapter 레그",
    userExposure: "회랑 라벨·근거 블록",
    userCopyHint: "sellMarketLabelKo",
    forbiddenHints: Object.freeze(["판매처 선택", "마켓 선택"]),
    userSurface: "expose",
  },
  executionPlatforms: {
    internalUse: "엔진/Admin fulfillment",
    userExposure: "표면 0",
    userCopyHint: "",
    forbiddenHints: Object.freeze(["Chrono24", "중고나라", "번개장터"]),
    userSurface: "strip",
  },
  executionMode: {
    internalUse: "orchestrate only",
    userExposure: "카피 AI 자동 처리",
    userCopyHint: "AI 자동 처리",
    forbiddenHints: Object.freeze(["실체결", "직접입찰", "호가창"]),
    userSurface: "label_only",
  },
  expectedSellDays: {
    internalUse: "Admin/historical only",
    userExposure: "유저 0",
    userCopyHint: "",
    forbiddenHints: Object.freeze(["예상 처리기간", "N일 후 판매"]),
    userSurface: "strip",
  },
  sellSuccessRate: {
    internalUse: "HistoricalSpread 표시",
    userExposure: "과거 유사 매칭",
    userCopyHint: "과거 유사 매칭",
    forbiddenHints: Object.freeze(["판매 성공률", "판매 확률"]),
    userSurface: "expose",
  },
  aiConfidenceScore: {
    internalUse: "AI score",
    userExposure: "AI 매칭 적합도",
    userCopyHint: "AI 매칭 적합도",
    forbiddenHints: Object.freeze(["당첨률", "판매 확률", "성공률"]),
    userSurface: "expose",
  },
  matchWaitersCount: {
    internalUse: "optional Fact",
    userExposure: "대기실 숫자",
    userCopyHint: "현재 대기자 {n}명",
    forbiddenHints: Object.freeze(["가짜 대기"]),
    userSurface: "fact_optional",
  },
  matchableOpportunityCount: {
    internalUse: "optional Fact",
    userExposure: "대기실 숫자",
    userCopyHint: "매칭 가능 기회 {n}개",
    forbiddenHints: Object.freeze(["가짜 대기"]),
    userSurface: "fact_optional",
  },
});

/** Keys always stripped from user JSON / SSR props (Admin API may keep). */
const USER_SURFACE_STRIP_KEYS = Object.freeze(
  Object.entries(INTERNAL_TO_USER_FIELD)
    .filter(([, m]) => m.userSurface === "strip")
    .map(([k]) => k),
);

/** Allowed Fact sources for waiting-room counts (§51.24 · 소스 없으면 숨김). */
const WAITING_FACT_SOURCES = Object.freeze(["engine", "admin"]);

/**
 * Trader-role jargon banned on user surface (CTA/본문).
 * Detail CTA `이 기회로 수익 벌기` is allowed (not in this list).
 */
const USER_BANNED_TRADER_JARGON = Object.freeze([
  "구매하기",
  "판매하기",
  "입찰하기",
  "마켓 둘러보기",
  "거래하기",
  "이 상품으로 수익 벌기",
  "판매 성공률",
  "당첨률",
  "매입가",
  "판매가",
]);

/** Primary CTA must not be this (help-only term). */
const USER_BANNED_PRIMARY_CTA = Object.freeze(["매칭 참여", "참여하기"]);

/**
 * @param {unknown} source
 * @returns {boolean}
 */
function isWaitingFactSource(source) {
  return WAITING_FACT_SOURCES.includes(String(source ?? ""));
}

/**
 * Project waiting-room Facts — hide slot when source missing or count invalid.
 * Never invent / merge demo numbers.
 *
 * @param {{
 *   matchWaitersCount?: number|null,
 *   matchableOpportunityCount?: number|null,
 *   factSource?: string|null,
 * }} input
 * @returns {{
 *   matchWaitersCount?: number,
 *   matchableOpportunityCount?: number,
 *   waitingFactSource?: string,
 * }}
 */
function projectWaitingFacts(input) {
  const source = String(input?.factSource ?? "").trim();
  if (!isWaitingFactSource(source)) {
    return {};
  }
  /** @type {{ matchWaitersCount?: number, matchableOpportunityCount?: number, waitingFactSource?: string }} */
  const out = { waitingFactSource: source };
  const waiters = input?.matchWaitersCount;
  if (waiters != null && Number.isFinite(Number(waiters)) && Number(waiters) >= 0) {
    out.matchWaitersCount = Math.floor(Number(waiters));
  }
  const matchable = input?.matchableOpportunityCount;
  if (
    matchable != null &&
    Number.isFinite(Number(matchable)) &&
    Number(matchable) >= 0
  ) {
    out.matchableOpportunityCount = Math.floor(Number(matchable));
  }
  // source alone without any count → still no display fields (slot hide)
  if (out.matchWaitersCount == null && out.matchableOpportunityCount == null) {
    return {};
  }
  return out;
}

/**
 * User-facing executionMode hint (code value stays `orchestrate`).
 * @param {string|undefined|null} executionMode
 * @returns {string}
 */
function userExecutionModeHint(executionMode) {
  if (executionMode != null && executionMode !== "orchestrate") {
    throw new Error("executionMode must be orchestrate");
  }
  return INTERNAL_TO_USER_FIELD.executionMode.userCopyHint;
}

/**
 * Strip INTERNAL-only keys and attach capital-provider USER projection.
 *
 * @param {Record<string, unknown>|null|undefined} card
 * @param {{
 *   audience?: 'user'|'admin',
 *   matchWaitersCount?: number|null,
 *   matchableOpportunityCount?: number|null,
 *   factSource?: string|null,
 * }} [opts]
 * @returns {Record<string, unknown>}
 */
function projectCapitalProviderUserSurface(card, opts = {}) {
  const audience = opts.audience ?? AUDIENCE_USER;
  const base =
    card && typeof card === "object" && !Array.isArray(card)
      ? { ...card }
      : {};

  if (audience === AUDIENCE_ADMIN) {
    // Admin may retain executionPlatforms / expectedSellDays
    return base;
  }

  for (const key of USER_SURFACE_STRIP_KEYS) {
    delete base[key];
  }

  if (base.executionMode != null && base.executionMode !== "orchestrate") {
    throw new Error("executionMode must be orchestrate on user surface");
  }
  if (base.executionMode === "orchestrate" || base.executionMode == null) {
    base.executionModeUserHint = userExecutionModeHint(
      /** @type {string|undefined} */ (base.executionMode) ?? "orchestrate",
    );
  }

  const waiting = projectWaitingFacts({
    matchWaitersCount: opts.matchWaitersCount ?? base.matchWaitersCount,
    matchableOpportunityCount:
      opts.matchableOpportunityCount ?? base.matchableOpportunityCount,
    factSource: opts.factSource ?? base.waitingFactSource ?? base.factSource,
  });
  // Remove unsourced waiting fields that may have been copied from INTERNAL
  delete base.matchWaitersCount;
  delete base.matchableOpportunityCount;
  delete base.waitingFactSource;
  delete base.factSource;
  Object.assign(base, waiting);

  return base;
}

/**
 * Guard: user payload must not leak INTERNAL strip keys or banned jargon strings.
 *
 * @param {unknown} payload
 * @param {{ audience?: 'user'|'admin', path?: string }} [opts]
 * @returns {{ ok: boolean, fails: string[] }}
 */
function assertUserSurfaceCapitalProvider(payload, opts = {}) {
  const audience = opts.audience ?? AUDIENCE_USER;
  const path = opts.path ?? "payload";
  /** @type {string[]} */
  const fails = [];

  if (audience === AUDIENCE_ADMIN) {
    return { ok: true, fails };
  }

  if (payload == null || typeof payload !== "object") {
    return { ok: true, fails };
  }

  const walk = (node, p) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${p}[${i}]`));
      return;
    }
    if (typeof node !== "object") {
      if (typeof node === "string") {
        for (const ban of USER_BANNED_TRADER_JARGON) {
          if (node.includes(ban)) {
            fails.push(`${p}: banned trader jargon "${ban}"`);
          }
        }
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (USER_SURFACE_STRIP_KEYS.includes(k)) {
        fails.push(`${p}.${k}: INTERNAL field must not appear on user surface`);
        continue;
      }
      if (
        (k === "matchWaitersCount" || k === "matchableOpportunityCount") &&
        v != null
      ) {
        const src =
          /** @type {Record<string, unknown>} */ (node).waitingFactSource ??
          /** @type {Record<string, unknown>} */ (node).factSource;
        if (!isWaitingFactSource(src)) {
          fails.push(
            `${p}.${k}: waiting Fact requires factSource engine|admin (got ${String(src ?? "missing")})`,
          );
        }
      }
      walk(v, `${p}.${k}`);
    }
  };

  walk(payload, path);
  return { ok: fails.length === 0, fails };
}

/**
 * Self-check invariants for CI (map completeness · strip keys).
 * @returns {{ ok: boolean, fails: string[] }}
 */
function assertCapitalProviderProjectionInvariants() {
  /** @type {string[]} */
  const fails = [];
  const required = [
    "buyPriceUsdt",
    "sellPriceUsdt",
    "buyMarketId",
    "sellMarketId",
    "executionPlatforms",
    "executionMode",
    "expectedSellDays",
    "sellSuccessRate",
    "aiConfidenceScore",
    "matchWaitersCount",
    "matchableOpportunityCount",
  ];
  for (const k of required) {
    if (!INTERNAL_TO_USER_FIELD[k]) {
      fails.push(`INTERNAL_TO_USER_FIELD missing ${k}`);
    }
  }
  if (!USER_SURFACE_STRIP_KEYS.includes("executionPlatforms")) {
    fails.push("executionPlatforms must be in USER_SURFACE_STRIP_KEYS");
  }
  if (!USER_SURFACE_STRIP_KEYS.includes("expectedSellDays")) {
    fails.push("expectedSellDays must be in USER_SURFACE_STRIP_KEYS");
  }
  if (INTERNAL_TO_USER_FIELD.executionPlatforms.userSurface !== "strip") {
    fails.push("executionPlatforms.userSurface must be strip");
  }
  if (INTERNAL_TO_USER_FIELD.sellSuccessRate.userCopyHint !== "과거 유사 매칭") {
    fails.push("sellSuccessRate userCopyHint must be 과거 유사 매칭");
  }
  if (INTERNAL_TO_USER_FIELD.aiConfidenceScore.userCopyHint !== "AI 매칭 적합도") {
    fails.push("aiConfidenceScore userCopyHint must be AI 매칭 적합도");
  }
  if (INTERNAL_TO_USER_FIELD.buyPriceUsdt.userCopyHint !== "저가 시세") {
    fails.push("buyPriceUsdt userCopyHint must be 저가 시세");
  }
  if (INTERNAL_TO_USER_FIELD.sellPriceUsdt.userCopyHint !== "고가 시세") {
    fails.push("sellPriceUsdt userCopyHint must be 고가 시세");
  }

  // strip round-trip
  const projected = projectCapitalProviderUserSurface(
    {
      id: "t1",
      buyPriceUsdt: "100",
      sellPriceUsdt: "120",
      executionPlatforms: ["ebay_us"],
      expectedSellDays: 3,
      executionMode: "orchestrate",
      matchWaitersCount: 99,
      aiConfidenceScore: 88,
    },
    { audience: AUDIENCE_USER },
  );
  if ("executionPlatforms" in projected) {
    fails.push("project must strip executionPlatforms for user");
  }
  if ("expectedSellDays" in projected) {
    fails.push("project must strip expectedSellDays for user");
  }
  if ("matchWaitersCount" in projected) {
    fails.push("unsourced matchWaitersCount must be stripped");
  }
  if (projected.executionModeUserHint !== "AI 자동 처리") {
    fails.push("executionModeUserHint must be AI 자동 처리");
  }

  const withFact = projectCapitalProviderUserSurface(
    { id: "t2", executionMode: "orchestrate" },
    {
      audience: AUDIENCE_USER,
      matchWaitersCount: 3,
      matchableOpportunityCount: 5,
      factSource: "engine",
    },
  );
  if (withFact.matchWaitersCount !== 3 || withFact.matchableOpportunityCount !== 5) {
    fails.push("sourced waiting Facts must project");
  }

  const adminKeep = projectCapitalProviderUserSurface(
    { executionPlatforms: ["ebay_us"], expectedSellDays: 2 },
    { audience: AUDIENCE_ADMIN },
  );
  if (!Array.isArray(adminKeep.executionPlatforms)) {
    fails.push("admin audience may retain executionPlatforms");
  }

  const guard = assertUserSurfaceCapitalProvider(
    { executionPlatforms: ["ebay_us"], title: "구매하기" },
    { audience: AUDIENCE_USER },
  );
  if (guard.ok) {
    fails.push("assertUserSurface must FAIL on executionPlatforms + 구매하기");
  }

  return { ok: fails.length === 0, fails };
}

module.exports = {
  AUDIENCE_USER,
  AUDIENCE_ADMIN,
  INTERNAL_TO_USER_FIELD,
  USER_SURFACE_STRIP_KEYS,
  WAITING_FACT_SOURCES,
  USER_BANNED_TRADER_JARGON,
  USER_BANNED_PRIMARY_CTA,
  isWaitingFactSource,
  projectWaitingFacts,
  userExecutionModeHint,
  projectCapitalProviderUserSurface,
  assertUserSurfaceCapitalProvider,
  assertCapitalProviderProjectionInvariants,
};
