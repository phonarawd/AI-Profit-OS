/**
 * Engine §0.0.4.2 — FX snapshot composition (오차0).
 * Primary: CoinGecko tether/krw → cg_usdt_krw
 * Fallback: CoinGecko USDT/USD × Frankfurter USD/KRW → cg_usdt_usd__frank_usd_krw
 * CI: verify:fx-snapshot-formula
 */

const {
  mulAmount,
  assertAmount,
  cmpAmount,
  absDiff,
  withinTolerance,
} = require("./money.cjs");

const FX_FORMULA_IDS = Object.freeze([
  "cg_usdt_krw",
  "cg_usdt_usd__frank_usd_krw",
]);

/**
 * @typedef {object} FxPrimaryInput
 * @property {string} usdtKrw CoinGecko tether → krw
 */

/**
 * @typedef {object} FxFallbackInput
 * @property {string} usdtUsd CoinGecko tether → usd
 * @property {string} usdKrw Frankfurter USD → KRW
 */

/**
 * @typedef {object} FxComposeInput
 * @property {FxPrimaryInput} [primary]
 * @property {FxFallbackInput} [fallback]
 * @property {string} [fxSnapshotId]
 * @property {string} [capturedAt] ISO-8601
 */

/**
 * Compose a single FX snapshot. Never mixes timestamps across sources
 * beyond the inputs provided for one compose call.
 * @param {FxComposeInput} input
 */
function composeFxSnapshot(input) {
  const id =
    input.fxSnapshotId && String(input.fxSnapshotId).trim()
      ? String(input.fxSnapshotId).trim()
      : `fx_${Date.now()}`;
  const capturedAt = input.capturedAt || new Date().toISOString();

  if (input.primary && input.primary.usdtKrw != null) {
    const usdtKrw = assertAmount(String(input.primary.usdtKrw), "usdtKrw");
    if (cmpAmount(usdtKrw, "0") <= 0) {
      throw new Error("usdtKrw must be > 0");
    }
    return {
      fxSnapshotId: id,
      formulaId: "cg_usdt_krw",
      sources: ["coingecko"],
      usdtKrw,
      usdtUsd: null,
      usdKrwFrank: null,
      /** legacy column name in fx_snapshots.usd_krw — stores USDT→KRW */
      usdKrw: usdtKrw,
      capturedAt,
    };
  }

  if (input.fallback) {
    const usdtUsd = assertAmount(String(input.fallback.usdtUsd), "usdtUsd");
    const usdKrw = assertAmount(String(input.fallback.usdKrw), "usdKrw");
    if (cmpAmount(usdtUsd, "0") <= 0 || cmpAmount(usdKrw, "0") <= 0) {
      throw new Error("fallback rates must be > 0");
    }
    const usdtKrw = mulAmount(usdtUsd, usdKrw);
    return {
      fxSnapshotId: id,
      formulaId: "cg_usdt_usd__frank_usd_krw",
      sources: ["coingecko", "frankfurter"],
      usdtKrw,
      usdtUsd,
      usdKrwFrank: usdKrw,
      usdKrw: usdtKrw,
      capturedAt,
    };
  }

  throw new Error("composeFxSnapshot requires primary or fallback rates");
}

/**
 * ≈ KRW display from USDT amount + snapshot (same snapshot only).
 * @param {string} amountUsdt
 * @param {{ usdtKrw: string }} snapshot
 */
function approxKrwFromSnapshot(amountUsdt, snapshot) {
  const amt = assertAmount(String(amountUsdt), "amountUsdt");
  const rate = assertAmount(String(snapshot.usdtKrw), "snapshot.usdtKrw");
  return mulAmount(amt, rate);
}

module.exports = {
  FX_FORMULA_IDS,
  composeFxSnapshot,
  approxKrwFromSnapshot,
  withinTolerance,
  absDiff,
};
