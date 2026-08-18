/**
 * Engine v7.23 R1 — HomeReadModelV1 pure mapper
 * Combines Money HomeMoneyRead + opportunity feed + growth + session.
 * todayPossibleProfitUsdt = Σ affordable ∧ available ∧ compareReady (server only).
 * ledgerTotal = settlementCompletedTodayCount COUNT (never USDT).
 * Fake zero / unauthorized→ready_data coerce = FORBIDDEN.
 */

const { addAmount, assertAmount } = require("./money.cjs");

/** @typedef {'loading'|'ready_empty'|'ready_data'|'stale'|'recoverable_error'|'blocked'|'unauthorized'} HomeViewState */
/** @typedef {'guest'|'authenticated'|'expired'} HomeSessionStatus */

const HOME_VIEW_STATES = Object.freeze([
  "loading",
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
]);

/** Server response excludes client-only loading */
const HOME_VIEW_STATES_SERVER = Object.freeze(
  HOME_VIEW_STATES.filter((s) => s !== "loading"),
);

const TODAY_POSSIBLE_DERIVATION_ID =
  "home.today_possible_affordable_available_compare_ready_sum";

const FORBIDDEN_FAKE_KEYS = Object.freeze([
  "availableUsdt",
  "todayPossible",
  "staticScanClaim",
  "guaranteedProfitUsdt",
]);

/**
 * @param {unknown} items
 * @returns {string} decimal string USDT sum (server_derived)
 */
function deriveTodayPossibleProfitUsdt(items) {
  let acc = "0";
  for (const raw of Array.isArray(items) ? items : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = /** @type {Record<string, unknown>} */ (raw);
    if (String(item.bucket || "") !== "affordable") continue;
    if (String(item.status || "") !== "available") continue;
    if (item.compareReady !== true) continue;
    const profit = item.expectedProfitUsdt;
    if (profit == null || profit === "") continue;
    try {
      acc = addAmount(acc, assertAmount(String(profit), "expectedProfitUsdt"));
    } catch {
      // skip non-amount
    }
  }
  return assertAmount(acc, "todayPossibleProfitUsdt");
}

/**
 * @param {HomeViewState[]} parts
 * @returns {HomeViewState}
 */
function composeViewState(parts) {
  const set = new Set(parts.filter(Boolean));
  if (set.has("unauthorized")) return "unauthorized";
  if (set.has("blocked")) return "blocked";
  if (set.has("recoverable_error")) return "recoverable_error";
  if (set.has("stale")) return "stale";
  if (set.has("ready_data")) return "ready_data";
  if (set.has("ready_empty")) return "ready_empty";
  return "recoverable_error";
}

/**
 * @param {{
 *   sessionStatus: HomeSessionStatus,
 *   money?: { state?: string, principalUsdt?: string, settlementCompletedTodayCount?: number, asOf?: object, source?: object, reasonCode?: string } | null,
 *   opportunityItems?: unknown[],
 *   opportunityMeta?: {
 *     affordableCount?: number,
 *     nearMissCount?: number,
 *     lockedHighCount?: number,
 *     topSuggestDepositUsdt?: string | null,
 *     asOf?: string | null,
 *     state?: string,
 *     reasonCode?: string,
 *   } | null,
 *   growth?: {
 *     tickerMode?: string,
 *     counterMode?: string,
 *     ledgerTotal?: number,
 *     asOf?: string,
 *     state?: string,
 *     reasonCode?: string,
 *   } | null,
 *   forceViewState?: HomeViewState,
 *   reasonCode?: string,
 * }} input
 */
function mapHomeReadModelV1(input) {
  const sessionStatus = input.sessionStatus;
  if (
    sessionStatus !== "guest" &&
    sessionStatus !== "authenticated" &&
    sessionStatus !== "expired"
  ) {
    throw new Error("home-read-model sessionStatus invalid");
  }

  if (sessionStatus === "guest" || sessionStatus === "expired") {
    const dto = {
      viewState: /** @type {HomeViewState} */ ("unauthorized"),
      reasonCode:
        input.reasonCode ||
        (sessionStatus === "expired"
          ? "home.read.session_expired"
          : "home.read.auth_required"),
      session: { status: sessionStatus },
      money: null,
      opportunity: null,
      growth: null,
      ledgerTotal: null,
      todayPossibleProfitUsdt: null,
      provenance: {
        todayPossibleProfitUsdt: null,
        ledgerTotal: null,
      },
      domainFsm: null,
    };
    assertNoFakeZeroHomeRead(dto);
    return dto;
  }

  const money = input.money || null;
  const oppMeta = input.opportunityMeta || {};
  const items = Array.isArray(input.opportunityItems)
    ? input.opportunityItems
    : [];
  const growth = input.growth || null;

  const moneyState = money?.state || "recoverable_error";
  let opportunityState = oppMeta.state;
  if (!opportunityState) {
    const affordable = Number(oppMeta.affordableCount || 0);
    opportunityState = affordable > 0 ? "ready_data" : "ready_empty";
  }

  const todayPossibleProfitUsdt = deriveTodayPossibleProfitUsdt(items);
  const settlementCount =
    money && typeof money.settlementCompletedTodayCount === "number"
      ? Math.max(0, Math.floor(money.settlementCompletedTodayCount))
      : null;

  // ledgerTotal SSOT = Money settlement COUNT (growth display alias · never USDT)
  const ledgerTotal = settlementCount;

  let growthState = growth?.state;
  if (!growthState) {
    if (!growth) growthState = "recoverable_error";
    else if (
      growth.tickerMode === "off" &&
      growth.counterMode === "off" &&
      (ledgerTotal === 0 || ledgerTotal == null)
    ) {
      growthState = "ready_empty";
    } else {
      growthState = "ready_data";
    }
  }

  const viewState =
    input.forceViewState ||
    composeViewState([
      /** @type {HomeViewState} */ (moneyState),
      /** @type {HomeViewState} */ (opportunityState),
      /** @type {HomeViewState} */ (growthState),
    ]);

  /** @type {string | undefined} */
  let reasonCode = input.reasonCode;
  if (!reasonCode) {
    reasonCode =
      money?.reasonCode || oppMeta.reasonCode || growth?.reasonCode || undefined;
  }

  const dto = {
    viewState,
    ...(reasonCode ? { reasonCode } : {}),
    session: { status: /** @type {HomeSessionStatus} */ ("authenticated") },
    money: money
      ? {
          principalUsdt: String(money.principalUsdt ?? "0"),
          settlementCompletedTodayCount: settlementCount ?? 0,
          asOf: money.asOf || null,
          source: money.source || null,
          state: moneyState,
          ...(money.reasonCode ? { reasonCode: money.reasonCode } : {}),
        }
      : null,
    opportunity: {
      todayPossibleProfitUsdt,
      affordableCount: Math.max(0, Number(oppMeta.affordableCount || 0) || 0),
      nearMissCount: Math.max(0, Number(oppMeta.nearMissCount || 0) || 0),
      lockedHighCount: Math.max(0, Number(oppMeta.lockedHighCount || 0) || 0),
      topSuggestDepositUsdt:
        oppMeta.topSuggestDepositUsdt != null
          ? String(oppMeta.topSuggestDepositUsdt)
          : null,
      itemCount: items.length,
      asOf: oppMeta.asOf || null,
      state: opportunityState,
      ...(oppMeta.reasonCode ? { reasonCode: oppMeta.reasonCode } : {}),
      provenance: {
        todayPossibleProfitUsdt: {
          provenance: "server_derived",
          derivationId: TODAY_POSSIBLE_DERIVATION_ID,
        },
      },
    },
    growth: growth
      ? {
          tickerMode: String(growth.tickerMode || "off"),
          counterMode: String(growth.counterMode || "off"),
          // Prefer Money COUNT SSOT; fall back to growth only if money absent
          ledgerTotal:
            ledgerTotal != null
              ? ledgerTotal
              : Math.max(0, Math.floor(Number(growth.ledgerTotal) || 0)),
          asOf: growth.asOf || null,
          state: growthState,
          ...(growth.reasonCode ? { reasonCode: growth.reasonCode } : {}),
        }
      : null,
    ledgerTotal,
    todayPossibleProfitUsdt,
    provenance: {
      todayPossibleProfitUsdt: {
        provenance: "server_derived",
        derivationId: TODAY_POSSIBLE_DERIVATION_ID,
      },
      ledgerTotal: {
        provenance: "server_derived",
        derivationId: "home.ledger_total_settlement_completed_today_count",
      },
    },
    domainFsm: null,
  };

  assertNoFakeZeroHomeRead(dto);
  return dto;
}

/**
 * Forbidden: unauthorized presented as ready_* with invented Fact zeros.
 * @param {Record<string, unknown>} dto
 */
function assertNoFakeZeroHomeRead(dto) {
  for (const key of FORBIDDEN_FAKE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(dto, key)) {
      throw new Error(`home-read-model FORBIDDEN key: ${key}`);
    }
  }
  const viewState = String(dto.viewState || "");
  if (viewState === "unauthorized") {
    if (dto.money != null || dto.opportunity != null) {
      throw new Error(
        "home-read-model unauthorized must not attach money/opportunity Fact",
      );
    }
    if (dto.todayPossibleProfitUsdt != null || dto.ledgerTotal != null) {
      throw new Error(
        "home-read-model unauthorized must not invent todayPossible/ledgerTotal",
      );
    }
  }
  if (viewState === "ready_data") {
    const session = /** @type {Record<string, unknown>} */ (dto.session || {});
    if (session.status !== "authenticated") {
      throw new Error("home-read-model ready_data requires authenticated session");
    }
  }
  const prov = /** @type {Record<string, unknown>} */ (dto.provenance || {});
  const tp = /** @type {Record<string, unknown>} */ (
    prov.todayPossibleProfitUsdt || {}
  );
  if (
    dto.todayPossibleProfitUsdt != null &&
    (tp.provenance !== "server_derived" ||
      tp.derivationId !== TODAY_POSSIBLE_DERIVATION_ID)
  ) {
    throw new Error(
      "home-read-model todayPossibleProfitUsdt must be tagged server_derived",
    );
  }
  return true;
}

module.exports = {
  HOME_VIEW_STATES,
  HOME_VIEW_STATES_SERVER,
  TODAY_POSSIBLE_DERIVATION_ID,
  FORBIDDEN_FAKE_KEYS,
  deriveTodayPossibleProfitUsdt,
  composeViewState,
  mapHomeReadModelV1,
  assertNoFakeZeroHomeRead,
};
