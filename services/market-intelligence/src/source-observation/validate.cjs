/**
 * purpose-split fail-closed validation.
 * DISCOVERY는 currency evidence가 없으면 nativeCurrency를 두지 않는다.
 * CONFIRMATION SUCCESS만 amount+currency+priceKind를 요구한다.
 */

const { assertAmount, cmpAmount } = require("../money.cjs");
const {
  OBSERVATION_PURPOSES,
  SOURCE_STATUSES,
  OBSERVATION_SOURCES,
  FORBIDDEN_OBSERVATION_SOURCES,
  NATIVE_CURRENCIES,
  PRICE_KINDS,
} = require("./contract.cjs");

const AMOUNT_RE = /^[0-9]+(\.[0-9]+)?$/;

/**
 * 타임스탬프를 가격으로 오인한 경우만 차단. 사업 가격 범위 추정 금지.
 * @param {string} raw
 */
function isObviouslyMalformedAmount(raw) {
  const whole = String(raw).split(".")[0].replace(/^-/, "");
  return whole.length >= 13;
}

/**
 * @param {unknown} obs
 * @returns {{ ok: true, observation: object } | { ok: false, sourceStatus: string, reason: string, failures: string[] }}
 */
function validateObservation(obs) {
  const failures = [];
  if (!obs || typeof obs !== "object" || Array.isArray(obs)) {
    return fail("PARSE_FAILED", "observation must be an object", ["not_object"]);
  }

  if (obs.assetId != null) failures.push("SOURCE_ITEM != ASSET — assetId forbidden");
  if (obs.opportunityId != null) {
    failures.push("SOURCE_OBSERVATION != OPPORTUNITY_TRUTH — opportunityId forbidden");
  }
  if (obs.priceUsdt != null || obs.expectedProfitUsdt != null) {
    failures.push("DISCOVERY_PRICE != OPPORTUNITY_PRICE — FX/profit fields forbidden");
  }
  if (obs.displayAuthorized !== false) {
    failures.push("OBSERVED_IMAGE != DISPLAY_AUTHORIZED — displayAuthorized must be false");
  }

  const source = String(obs.source ?? "");
  if (FORBIDDEN_OBSERVATION_SOURCES.includes(source) || source.includes("yahoo")) {
    return fail("PARSE_FAILED", "YAHOO_SOURCE_ZERO", ["yahoo_forbidden"]);
  }
  if (!OBSERVATION_SOURCES.includes(source)) failures.push("source invalid");

  const purpose = obs.observationPurpose;
  if (!OBSERVATION_PURPOSES.includes(purpose)) failures.push("observationPurpose invalid");

  const status = obs.sourceStatus;
  if (!SOURCE_STATUSES.includes(status)) failures.push("sourceStatus invalid");

  for (const key of [
    "id",
    "externalItemId",
    "url",
    "title",
    "imageUrl",
    "observedAt",
    "fetchedAt",
    "parserVersion",
  ]) {
    if (typeof obs[key] !== "string" || obs[key].trim() === "") {
      failures.push(`${key} required`);
    }
  }

  if (obs.nativeCurrency != null) {
    if (!NATIVE_CURRENCIES.includes(obs.nativeCurrency)) {
      failures.push("nativeCurrency invalid");
    }
  }

  if (obs.nativeAmount != null) {
    if (typeof obs.nativeAmount !== "string" || !AMOUNT_RE.test(obs.nativeAmount)) {
      failures.push("nativeAmount must be decimal string");
    } else if (isObviouslyMalformedAmount(obs.nativeAmount)) {
      failures.push("nativeAmount obviously malformed");
    } else {
      try {
        assertAmount(obs.nativeAmount, "nativeAmount");
        if (cmpAmount(obs.nativeAmount, "0") <= 0) failures.push("nativeAmount must be > 0");
      } catch {
        failures.push("nativeAmount money contract");
      }
    }
  }

  if (purpose === "DISCOVERY") {
    if (obs.confirmedMarketTruth === true) {
      failures.push("DISCOVERY_OBSERVATION != CONFIRMED_MARKET_TRUTH");
    }
    if (obs.opportunityPrice === true) {
      failures.push("DISCOVERY_PRICE != OPPORTUNITY_PRICE");
    }
  }

  if (purpose === "CONFIRMATION" && status === "SUCCESS") {
    if (obs.nativeAmount == null) failures.push("CONFIRMATION SUCCESS requires nativeAmount");
    if (obs.nativeCurrency == null) {
      failures.push("CONFIRMATION SUCCESS requires nativeCurrency evidence");
    }
    const priceKind = obs.meta && obs.meta.priceKind;
    if (!PRICE_KINDS.includes(priceKind)) {
      failures.push("CONFIRMATION SUCCESS requires meta.priceKind");
    }
  }

  if (failures.length) {
    return fail(status === "SUCCESS" ? "PARSE_FAILED" : status || "PARSE_FAILED", failures[0], failures);
  }
  return { ok: true, observation: obs };
}

function fail(sourceStatus, reason, failures) {
  return { ok: false, sourceStatus, reason, failures };
}

module.exports = {
  validateObservation,
  isObviouslyMalformedAmount,
};
