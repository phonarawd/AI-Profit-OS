/**
 * P0-C FX ingest decision — per-leg provenance, immutable insert, anomaly fail-closed.
 * Nest persists the decision. Tests execute this module directly.
 */
"use strict";

const {
  composeFxSnapshot,
  deriveMarketplaceLegs,
} = require("./fx-snapshot-formula.cjs");
const {
  detectUsdtKrwAnomaly,
  isPositiveRate,
} = require("./fx-display-policy.cjs");

/** CoinGecko is collected every 10m; allow one 5m collection grace. */
const COINGECKO_CARRY_FORWARD_MS = 15 * 60 * 1000;
/** Frankfurter is re-confirmed hourly; a bounded outage may reuse the last confirmed official quote. */
const FRANKFURTER_CARRY_FORWARD_MS = 6 * 60 * 60 * 1000;

function provenanceKeyMap() {
  return {
    usdtKrw: "usdtKrw",
    usdtUsd: "usdtPerUsd",
    usdKrw: "usdKrwFrank",
    usdGbp: "gbpUsd",
    usdEur: "eurUsd",
    usdAud: "audUsd",
  };
}

function carryLeg(row, provenanceKey, value, nowMs, maxAgeMs, expectedSource) {
  if (!row || !value || !isPositiveRate(value)) return null;
  const p = row.rate_provenance?.[provenanceKey];
  if (!p || p.source !== expectedSource) return null;
  const capturedMs = Date.parse(p.capturedAt);
  if (!Number.isFinite(capturedMs)) return null;
  const ageMs = nowMs - capturedMs;
  if (ageMs < 0 || ageMs > maxAgeMs) return null;
  return value;
}

function mergeProvenance(prev, adapterId, observedAt, raw) {
  const merged = { ...(prev ?? {}) };
  for (const [rawKey, legKey] of Object.entries(provenanceKeyMap())) {
    if (raw[rawKey] != null) {
      merged[legKey] = { source: adapterId, capturedAt: observedAt };
    }
  }
  return merged;
}

function rawObservationUnchanged(prev, adapterId, observedAt, raw) {
  for (const [rawKey, legKey] of Object.entries(provenanceKeyMap())) {
    if (raw[rawKey] == null) continue;
    const p = prev?.[legKey];
    if (!p || p.source !== adapterId || p.capturedAt !== observedAt) {
      return false;
    }
  }
  return true;
}

function readAdapterFields(adapterId, fx) {
  const out = {};
  const take = (key, field) => {
    const v = fx[key];
    if (v == null) return;
    const s = String(v);
    if (isPositiveRate(s)) out[field] = s;
  };
  if (adapterId === "coingecko") {
    take("usdtKrw", "usdtKrw");
    take("usdtUsd", "usdtUsd");
  } else {
    take("usdKrw", "usdKrw");
    take("usdGbp", "usdGbp");
    take("usdEur", "usdEur");
    take("usdAud", "usdAud");
  }
  return out;
}

function isIsoDate(v) {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

/**
 * @param {{
 *   adapterId: "coingecko" | "frankfurter",
 *   fx: Record<string, unknown> | null | undefined,
 *   observedAt: string,
 *   prev: object | null,
 * }} input
 */
function decideFxIngest(input) {
  const fx = input.fx && typeof input.fx === "object" ? input.fx : {};
  const observedAt = isIsoDate(input.observedAt)
    ? input.observedAt
    : new Date().toISOString();
  const nowMs = Date.parse(observedAt);
  const raw = readAdapterFields(input.adapterId, fx);
  if (Object.keys(raw).length === 0) {
    return {
      action: "reject",
      reason: "FX_EMPTY_PAYLOAD",
      snapshot: null,
    };
  }

  const prev = input.prev ?? null;
  const prevUsdtUsdFresh = carryLeg(
    prev,
    "usdtPerUsd",
    prev?.usdt_usd ?? null,
    nowMs,
    COINGECKO_CARRY_FORWARD_MS,
    "coingecko",
  );
  const prevUsdtPerUsdFresh = carryLeg(
    prev,
    "usdtPerUsd",
    prev?.usdt_per_usd ?? null,
    nowMs,
    COINGECKO_CARRY_FORWARD_MS,
    "coingecko",
  );
  const prevUsdKrwFrankFresh = carryLeg(
    prev,
    "usdKrwFrank",
    prev?.usd_krw_frank ?? null,
    nowMs,
    FRANKFURTER_CARRY_FORWARD_MS,
    "frankfurter",
  );
  const prevGbpUsdFresh = carryLeg(
    prev,
    "gbpUsd",
    prev?.gbp_usd ?? null,
    nowMs,
    FRANKFURTER_CARRY_FORWARD_MS,
    "frankfurter",
  );
  const prevEurUsdFresh = carryLeg(
    prev,
    "eurUsd",
    prev?.eur_usd ?? null,
    nowMs,
    FRANKFURTER_CARRY_FORWARD_MS,
    "frankfurter",
  );
  const prevAudUsdFresh = carryLeg(
    prev,
    "audUsd",
    prev?.aud_usd ?? null,
    nowMs,
    FRANKFURTER_CARRY_FORWARD_MS,
    "frankfurter",
  );

  const anomalyReference = raw.usdKrw ?? prevUsdKrwFrankFresh;
  if (raw.usdtKrw && raw.usdtUsd && anomalyReference) {
    const anomaly = detectUsdtKrwAnomaly(
      raw.usdtKrw,
      raw.usdtUsd,
      anomalyReference,
    );
    if (anomaly.anomalous) {
      return {
        action: "reject",
        reason: "FX_ANOMALY_REJECTED",
        snapshot: null,
        anomaly,
      };
    }
  }

  const freshLegs = deriveMarketplaceLegs({
    usdtUsd: raw.usdtUsd,
    usdGbp: raw.usdGbp,
    usdEur: raw.usdEur,
    usdAud: raw.usdAud,
  });
  const gbpUsd = freshLegs.gbpUsd ?? prevGbpUsdFresh;
  const eurUsd = freshLegs.eurUsd ?? prevEurUsdFresh;
  const audUsd = freshLegs.audUsd ?? prevAudUsdFresh;
  let usdtPerUsd = freshLegs.usdtPerUsd ?? prevUsdtPerUsdFresh;

  let usdtKrw;
  let usdtUsdOut;
  let usdKrwFrank;
  let formulaId;

  if (raw.usdtKrw) {
    const composed = composeFxSnapshot({
      fxSnapshotId: "tmp",
      primary: { usdtKrw: raw.usdtKrw },
      capturedAt: observedAt,
    });
    usdtKrw = composed.usdtKrw;
    usdtUsdOut = raw.usdtUsd ?? prevUsdtUsdFresh;
    usdKrwFrank = raw.usdKrw ?? prevUsdKrwFrankFresh;
    formulaId = composed.formulaId;
  } else if (raw.usdtUsd && (raw.usdKrw || prevUsdKrwFrankFresh)) {
    const usdKrwLeg = raw.usdKrw ?? prevUsdKrwFrankFresh;
    const composed = composeFxSnapshot({
      fxSnapshotId: "tmp",
      fallback: { usdtUsd: raw.usdtUsd, usdKrw: usdKrwLeg },
      capturedAt: observedAt,
    });
    usdtKrw = composed.usdtKrw;
    usdtUsdOut = composed.usdtUsd;
    usdKrwFrank = composed.usdKrwFrank;
    formulaId = composed.formulaId;
  } else if (raw.usdKrw && prevUsdtUsdFresh) {
    const composed = composeFxSnapshot({
      fxSnapshotId: "tmp",
      fallback: { usdtUsd: prevUsdtUsdFresh, usdKrw: raw.usdKrw },
      capturedAt: observedAt,
    });
    usdtKrw = composed.usdtKrw;
    usdtUsdOut = composed.usdtUsd;
    usdKrwFrank = composed.usdKrwFrank;
    formulaId = composed.formulaId;
  } else if (prev) {
    usdtKrw = prev.usd_krw;
    usdtUsdOut = prevUsdtUsdFresh;
    usdKrwFrank = raw.usdKrw ?? prevUsdKrwFrankFresh;
    formulaId = prev.formula_id;
  } else {
    return {
      action: "reject",
      reason: "FX_NO_KRW_LEG_AVAILABLE",
      snapshot: null,
    };
  }

  if (usdtPerUsd == null && usdtUsdOut && isPositiveRate(usdtUsdOut)) {
    usdtPerUsd = deriveMarketplaceLegs({ usdtUsd: usdtUsdOut }).usdtPerUsd;
  }

  const sources = Array.from(
    new Set([...(prev?.sources ?? []), input.adapterId]),
  );
  const rateProvenance = mergeProvenance(
    prev?.rate_provenance ?? null,
    input.adapterId,
    observedAt,
    raw,
  );
  const observationUnchanged = rawObservationUnchanged(
    prev?.rate_provenance ?? null,
    input.adapterId,
    observedAt,
    raw,
  );
  const unchanged =
    !!prev &&
    observationUnchanged &&
    prev.usd_krw === usdtKrw &&
    (prev.usdt_usd ?? null) === usdtUsdOut &&
    (prev.usd_krw_frank ?? null) === usdKrwFrank &&
    (prev.gbp_usd ?? null) === gbpUsd &&
    (prev.eur_usd ?? null) === eurUsd &&
    (prev.aud_usd ?? null) === audUsd &&
    (prev.usdt_per_usd ?? null) === usdtPerUsd;

  const snapshot = {
    usdtKrw,
    usdtUsdOut: usdtUsdOut ?? null,
    usdKrwFrank: usdKrwFrank ?? null,
    gbpUsd: gbpUsd ?? null,
    eurUsd: eurUsd ?? null,
    audUsd: audUsd ?? null,
    usdtPerUsd: usdtPerUsd ?? null,
    formulaId,
    sources,
    rateProvenance,
  };

  if (unchanged) {
    return {
      action: "reuse",
      reason: "FX_OBSERVATION_UNCHANGED",
      snapshotId: prev.id,
      snapshot,
    };
  }

  return {
    action: "insert",
    snapshot,
    observedAt,
  };
}

function evaluateFxTickPublication(input) {
  const forwarded = input.forwarded === 1 ? 1 : 0;
  const published = Boolean(input.dryRun) || forwarded === 1;
  const ok = Boolean(input.dryRun) || (!input.quoteError && forwarded === 1);
  return { forwarded, published, ok };
}

function interpretNestIngestResponse(input) {
  if (input.httpOk && input.bodyOk === false) {
    return { forwarded: 0, forwardError: "nest_ingest_rejected" };
  }
  if (input.httpOk) {
    return { forwarded: 1, forwardError: null };
  }
  if (input.networkError) {
    return { forwarded: 0, forwardError: "nest_ingest_network_error" };
  }
  return {
    forwarded: 0,
    forwardError: `nest_ingest_${input.status ?? "unknown"}`,
  };
}

function fxRefreshUnavailable() {
  return {
    fxSnapshotId: null,
    capturedAt: null,
    principalKrwApprox: null,
    withdrawableProfitKrwApprox: null,
    expectedProfitKrwApprox: null,
    krwDisplayAvailable: false,
    fxStatus: "UNAVAILABLE",
    quotes: [],
  };
}

function formatSignedMoneyLines(usdtRaw, krwRaw) {
  const usdtNeg = String(usdtRaw).startsWith("-");
  const usdtAbs = usdtNeg ? String(usdtRaw).slice(1) : String(usdtRaw);
  const usdtLine = `${usdtNeg ? "-" : "+"}${usdtAbs} USDT`;
  const krwNeg = String(krwRaw).startsWith("-");
  const krwAbs = krwNeg ? String(krwRaw).slice(1) : String(krwRaw);
  const sign = krwNeg ? "-" : "+";
  const krwLine = `약 ${sign}₩${krwAbs}`;
  return { usdtLine, krwLine };
}

function isoMinutesAgo(baseIso, minutes) {
  return new Date(Date.parse(baseIso) - minutes * 60 * 1000).toISOString();
}

function selftestFxIngestDecision() {
  const fails = [];
  const t0 = "2026-08-26T12:00:00.000Z";
  const t10 = "2026-08-26T12:10:00.000Z";
  const tFrank = isoMinutesAgo(t10, 50);

  const prevFresh = {
    id: "fx_prev",
    usd_krw: "1387.11",
    usdt_usd: "0.99993",
    usd_krw_frank: "1386.4",
    gbp_usd: "1.27",
    eur_usd: "1.08",
    aud_usd: "0.66",
    usdt_per_usd: deriveMarketplaceLegs({ usdtUsd: "0.99993" }).usdtPerUsd,
    formula_id: "cg_usdt_krw",
    sources: ["coingecko", "frankfurter"],
    captured_at: t0,
    rate_provenance: {
      usdtKrw: { source: "coingecko", capturedAt: t0 },
      usdtPerUsd: { source: "coingecko", capturedAt: t0 },
      usdKrwFrank: { source: "frankfurter", capturedAt: tFrank },
      gbpUsd: { source: "frankfurter", capturedAt: tFrank },
      eurUsd: { source: "frankfurter", capturedAt: tFrank },
      audUsd: { source: "frankfurter", capturedAt: tFrank },
    },
  };

  const sameRateNewTime = decideFxIngest({
    adapterId: "coingecko",
    observedAt: t10,
    prev: prevFresh,
    fx: { usdtKrw: "1387.11", usdtUsd: "0.99993" },
  });
  if (sameRateNewTime.action !== "insert") {
    fails.push("CASE1 same-rate new observation must insert");
  }
  if (sameRateNewTime.snapshot?.rateProvenance?.usdtKrw?.capturedAt !== t10) {
    fails.push("CASE1 must persist newer CoinGecko observation time");
  }
  if (sameRateNewTime.snapshot?.rateProvenance?.gbpUsd?.capturedAt !== tFrank) {
    fails.push("CASE1 must not refresh Frankfurter GBP provenance");
  }

  const sameRateSameTime = decideFxIngest({
    adapterId: "coingecko",
    observedAt: t0,
    prev: prevFresh,
    fx: { usdtKrw: "1387.11", usdtUsd: "0.99993" },
  });
  if (sameRateSameTime.action !== "reuse") {
    fails.push("CASE2 same observation must dedupe");
  }

  const gbpAge = decideFxIngest({
    adapterId: "coingecko",
    observedAt: t10,
    prev: prevFresh,
    fx: { usdtKrw: "1388.01", usdtUsd: "0.99991" },
  });
  if (gbpAge.snapshot?.rateProvenance?.gbpUsd?.capturedAt !== tFrank) {
    fails.push("CASE3 CoinGecko tick must not reset GBP provenance age");
  }
  if (gbpAge.snapshot?.gbpUsd !== "1.27") {
    fails.push("CASE3 still-fresh GBP value may carry");
  }

  const staleFrank = isoMinutesAgo(t10, 7 * 60);
  const expiredFiat = decideFxIngest({
    adapterId: "coingecko",
    observedAt: t10,
    prev: {
      ...prevFresh,
      rate_provenance: {
        ...prevFresh.rate_provenance,
        gbpUsd: { source: "frankfurter", capturedAt: staleFrank },
        eurUsd: { source: "frankfurter", capturedAt: staleFrank },
        audUsd: { source: "frankfurter", capturedAt: staleFrank },
        usdKrwFrank: { source: "frankfurter", capturedAt: staleFrank },
      },
    },
    fx: { usdtKrw: "1387.11", usdtUsd: "0.99993" },
  });
  if (expiredFiat.snapshot?.gbpUsd != null) {
    fails.push("CASE4 stale GBP must expire to null");
  }
  if (expiredFiat.snapshot?.eurUsd != null) {
    fails.push("CASE4 stale EUR must expire to null");
  }
  if (expiredFiat.snapshot?.audUsd != null) {
    fails.push("CASE4 stale AUD must expire to null");
  }
  if (expiredFiat.snapshot?.rateProvenance?.gbpUsd?.capturedAt !== staleFrank) {
    fails.push("CASE4 expired GBP provenance time must stay old, not row time");
  }

  const anomalous = decideFxIngest({
    adapterId: "coingecko",
    observedAt: t10,
    prev: prevFresh,
    fx: { usdtKrw: "2000", usdtUsd: "1.00" },
  });
  if (anomalous.action !== "reject" || anomalous.reason !== "FX_ANOMALY_REJECTED") {
    fails.push("CASE5 anomalous KRW must not publish");
  }

  const unavailable = fxRefreshUnavailable();
  if (
    unavailable.krwDisplayAvailable !== false ||
    unavailable.fxStatus !== "UNAVAILABLE" ||
    unavailable.expectedProfitKrwApprox !== null
  ) {
    fails.push("CASE6 transport failure payload must hide KRW");
  }

  const nest500 = interpretNestIngestResponse({
    httpOk: false,
    status: 500,
    bodyOk: undefined,
  });
  const pub500 = evaluateFxTickPublication({
    quoteError: undefined,
    forwarded: nest500.forwarded,
    dryRun: false,
  });
  if (pub500.ok || pub500.published || nest500.forwarded !== 0) {
    fails.push("CASE7 Nest HTTP 500 must not count as publication success");
  }

  const nestTimeout = interpretNestIngestResponse({
    httpOk: false,
    networkError: true,
  });
  const pubTimeout = evaluateFxTickPublication({
    quoteError: undefined,
    forwarded: nestTimeout.forwarded,
    dryRun: false,
  });
  if (pubTimeout.ok || nestTimeout.forwardError !== "nest_ingest_network_error") {
    fails.push("CASE8 Nest timeout must not count as publication success");
  }

  const nestRejected = interpretNestIngestResponse({
    httpOk: true,
    status: 200,
    bodyOk: false,
  });
  if (nestRejected.forwarded !== 0) {
    fails.push("Nest 200 + ok:false must not count as forwarded");
  }

  const signed = formatSignedMoneyLines("24.18", "33540");
  const signedNeg = formatSignedMoneyLines("-8.42", "-11680");
  if (signed.usdtLine !== "+24.18 USDT" || signed.krwLine !== "약 +₩33540") {
    fails.push("CASE10 plus sign must precede won symbol");
  }
  if (signedNeg.usdtLine !== "-8.42 USDT" || signedNeg.krwLine !== "약 -₩11680") {
    fails.push("CASE10 minus sign must precede won symbol");
  }
  if (signed.krwLine.includes("₩+") || signedNeg.krwLine.includes("₩-")) {
    fails.push("CASE10 must never render ₩+ or ₩-");
  }

  const readExpiredGbp = carryLeg(
    {
      rate_provenance: {
        gbpUsd: { source: "frankfurter", capturedAt: staleFrank },
      },
    },
    "gbpUsd",
    "1.27",
    Date.parse(t10),
    FRANKFURTER_CARRY_FORWARD_MS,
    "frankfurter",
  );
  if (readExpiredGbp != null) {
    fails.push("read-path stale GBP must not resurrect from row.captured_at");
  }

  if (fails.length) {
    throw new Error(fails.join("\n"));
  }
  return true;
}

module.exports = {
  COINGECKO_CARRY_FORWARD_MS,
  FRANKFURTER_CARRY_FORWARD_MS,
  provenanceKeyMap,
  carryLeg,
  mergeProvenance,
  rawObservationUnchanged,
  readAdapterFields,
  decideFxIngest,
  evaluateFxTickPublication,
  interpretNestIngestResponse,
  fxRefreshUnavailable,
  formatSignedMoneyLines,
  selftestFxIngestDecision,
};
