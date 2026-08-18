/**
 * Engine §0.0.4.2 — FX snapshot composition (오차0).
 * Primary: CoinGecko tether/krw → cg_usdt_krw
 * Fallback: CoinGecko USDT/USD × Frankfurter USD/KRW → cg_usdt_usd__frank_usd_krw
 * CI: verify:fx-snapshot-formula
 */

const {
  mulAmount,
  divAmount,
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
 * PTF-00C P0-A/P0-B — Day-1 marketplace fiat legs accepted for native→USDT
 * normalization (eBay EBAY_US/GB/DE/AU listing currencies). AUD/EUR added
 * here even though DE uses EUR and AU uses AUD — DE marketplaceId stays
 * EBAY_DE but Browse API items can be denominated in EUR.
 */
const SUPPORTED_MARKETPLACE_FIAT_CURRENCIES = Object.freeze([
  "USD",
  "GBP",
  "EUR",
  "AUD",
]);
/** Fiat above + USDT identity (already-normalized, no conversion needed). */
const SUPPORTED_NATIVE_CURRENCIES = Object.freeze([
  ...SUPPORTED_MARKETPLACE_FIAT_CURRENCIES,
  "USDT",
]);

/** nativeCurrency → fx snapshot field holding "USD per 1 <currency>". */
const FIAT_USD_RATE_FIELD = Object.freeze({
  GBP: "gbpUsd",
  EUR: "eurUsd",
  AUD: "audUsd",
});

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
 * @property {FxMarketplaceRawInput} [marketplaceRaw]
 */

/**
 * @typedef {object} FxMarketplaceRawInput
 * @property {string} [usdtUsd] CoinGecko tether→usd (USD per 1 USDT) — reuse
 *   fallback.usdtUsd when both KRW-fallback and marketplace legs compose
 *   from the same CoinGecko tick.
 * @property {string} [usdGbp] Frankfurter base=USD rates.GBP (GBP per 1 USD)
 * @property {string} [usdEur] Frankfurter base=USD rates.EUR (EUR per 1 USD)
 * @property {string} [usdAud] Frankfurter base=USD rates.AUD (AUD per 1 USD)
 */

/**
 * Invert raw "X per 1 USD"/"USD per 1 USDT" provider quotes into the
 * multiplication-ready legs normalizeNativeToUsdt consumes. Pure decimal
 * division (money.cjs) — never float. Missing inputs → leg stays null
 * (fail-closed downstream, never fabricated).
 * @param {FxMarketplaceRawInput} raw
 */
function deriveMarketplaceLegs(raw) {
  const legs = { usdtPerUsd: null, gbpUsd: null, eurUsd: null, audUsd: null };
  if (raw.usdtUsd != null) {
    const usdtUsd = assertAmount(String(raw.usdtUsd), "usdtUsd");
    if (cmpAmount(usdtUsd, "0") <= 0) throw new Error("usdtUsd must be > 0");
    legs.usdtPerUsd = divAmount("1", usdtUsd);
  }
  if (raw.usdGbp != null) {
    const usdGbp = assertAmount(String(raw.usdGbp), "usdGbp");
    if (cmpAmount(usdGbp, "0") <= 0) throw new Error("usdGbp must be > 0");
    legs.gbpUsd = divAmount("1", usdGbp);
  }
  if (raw.usdEur != null) {
    const usdEur = assertAmount(String(raw.usdEur), "usdEur");
    if (cmpAmount(usdEur, "0") <= 0) throw new Error("usdEur must be > 0");
    legs.eurUsd = divAmount("1", usdEur);
  }
  if (raw.usdAud != null) {
    const usdAud = assertAmount(String(raw.usdAud), "usdAud");
    if (cmpAmount(usdAud, "0") <= 0) throw new Error("usdAud must be > 0");
    legs.audUsd = divAmount("1", usdAud);
  }
  return legs;
}

/**
 * Compose a single FX snapshot. Never mixes timestamps across sources
 * beyond the inputs provided for one compose call.
 *
 * `marketplaceRaw` (PTF-00C P0-B) is purely additive: omitting it keeps the
 * exact legacy primary/fallback KRW-display shape/behavior unchanged.
 * @param {FxComposeInput} input
 */
function composeFxSnapshot(input) {
  const id =
    input.fxSnapshotId && String(input.fxSnapshotId).trim()
      ? String(input.fxSnapshotId).trim()
      : `fx_${Date.now()}`;
  const capturedAt = input.capturedAt || new Date().toISOString();
  const marketplace = input.marketplaceRaw
    ? deriveMarketplaceLegs(input.marketplaceRaw)
    : null;

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
      ...(marketplace
        ? { gbpUsd: marketplace.gbpUsd, eurUsd: marketplace.eurUsd, audUsd: marketplace.audUsd, usdtPerUsd: marketplace.usdtPerUsd }
        : {}),
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
      ...(marketplace
        ? { gbpUsd: marketplace.gbpUsd, eurUsd: marketplace.eurUsd, audUsd: marketplace.audUsd, usdtPerUsd: marketplace.usdtPerUsd ?? divAmount("1", usdtUsd) }
        : {}),
    };
  }

  throw new Error("composeFxSnapshot requires primary or fallback rates");
}

/**
 * PTF-00C P0-A §2/§3 — native marketplace price → authoritative normalizedUsdt.
 *
 * Fail-closed: throws (never fabricates) when nativeCurrency is unsupported
 * or the snapshot lacks the rate leg required for that currency. Never
 * assumes 1 USD == 1 USDT — USD listings still multiply through usdtPerUsd.
 * @param {{
 *   nativeAmount: string,
 *   nativeCurrency: string,
 *   snapshot: { gbpUsd?: string|null, eurUsd?: string|null, audUsd?: string|null, usdtPerUsd?: string|null },
 * }} input
 * @returns {{ normalizedUsdt: string, usdPerNative: string, usdtPerUsd: string, chain: 'identity'|'usd_usdt'|'fiat_usd_usdt' }}
 */
function normalizeNativeToUsdt(input) {
  const nativeAmount = assertAmount(String(input.nativeAmount), "nativeAmount");
  if (cmpAmount(nativeAmount, "0") < 0) {
    throw new Error("nativeAmount must be >= 0");
  }
  const nativeCurrency = String(input.nativeCurrency || "").trim().toUpperCase();
  if (!SUPPORTED_NATIVE_CURRENCIES.includes(nativeCurrency)) {
    throw new Error(`FX_UNSUPPORTED_CURRENCY: ${nativeCurrency || "(empty)"}`);
  }

  if (nativeCurrency === "USDT") {
    return {
      normalizedUsdt: nativeAmount,
      usdPerNative: "1",
      usdtPerUsd: "1",
      chain: "identity",
    };
  }

  const snapshot = input.snapshot || {};
  if (snapshot.usdtPerUsd == null) {
    throw new Error("FX_MISSING: snapshot.usdtPerUsd required to normalize to USDT");
  }
  const usdtPerUsd = assertAmount(String(snapshot.usdtPerUsd), "snapshot.usdtPerUsd");
  if (cmpAmount(usdtPerUsd, "0") <= 0) {
    throw new Error("FX_INVALID: snapshot.usdtPerUsd must be > 0");
  }

  let usdPerNative;
  if (nativeCurrency === "USD") {
    usdPerNative = "1";
  } else {
    const field = FIAT_USD_RATE_FIELD[nativeCurrency];
    const raw = snapshot[field];
    if (raw == null) {
      throw new Error(`FX_MISSING: snapshot.${field} required to normalize ${nativeCurrency}`);
    }
    usdPerNative = assertAmount(String(raw), `snapshot.${field}`);
    if (cmpAmount(usdPerNative, "0") <= 0) {
      throw new Error(`FX_INVALID: snapshot.${field} must be > 0`);
    }
  }

  const usdAmount = mulAmount(nativeAmount, usdPerNative);
  const normalizedUsdt = mulAmount(usdAmount, usdtPerUsd);
  return {
    normalizedUsdt,
    usdPerNative,
    usdtPerUsd,
    chain: nativeCurrency === "USD" ? "usd_usdt" : "fiat_usd_usdt",
  };
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
  SUPPORTED_MARKETPLACE_FIAT_CURRENCIES,
  SUPPORTED_NATIVE_CURRENCIES,
  FIAT_USD_RATE_FIELD,
  composeFxSnapshot,
  deriveMarketplaceLegs,
  normalizeNativeToUsdt,
  approxKrwFromSnapshot,
  withinTolerance,
  absDiff,
};
