/**
 * P-lane Numeric Grounding — Engine §47.16.5
 *
 * Post-hoc validation targets platform factual numeric claims,
 * not every numeral appearing in prose.
 *
 * - currency / percent / unit-bound quantity → always ground
 * - ordinal / bare unitless generic quantity → exclude
 * - date/time → NOT categorical exclude; ground when factsUsed has date
 *   fields, else unsupported (blocks invented calendar claims)
 * - serverDerivedAllowlist → {value, provenance:"server_derived", derivationId}
 */

"use strict";

const { isFactFresh } = require("./fact-card-loader.cjs");

/** Known Home / Coach server-derived derivationIds (whitelist). */
const SERVER_DERIVED_ALLOWLIST = Object.freeze({
  home_today_possible_affordable_available_compare_ready_sum: Object.freeze({
    derivationId:
      "home.today_possible_affordable_available_compare_ready_sum",
    kind: "currency",
    unit: "USDT",
    currency: "USDT",
  }),
  home_ledger_total_settlement_completed_today_count: Object.freeze({
    derivationId: "home.ledger_total_settlement_completed_today_count",
    kind: "quantity",
    unit: "count",
    currency: null,
  }),
});

const ALLOWED_DERIVATION_IDS = Object.freeze(
  new Set(
    Object.values(SERVER_DERIVED_ALLOWLIST).map((e) => e.derivationId),
  ),
);

const NUMERIC_KINDS = Object.freeze([
  "currency",
  "percent",
  "quantity",
  "date",
  "ordinal",
  "id_like",
  "generic",
]);

const AVAILABILITIES = Object.freeze([
  "known",
  "known_zero",
  "unknown",
  "unavailable",
  "unauthorized",
  "stale",
  "not_applicable",
]);

/** Fact payload keys that carry monetary amounts (USDT unless noted). */
const CURRENCY_FIELDS = Object.freeze([
  "principalUsdt",
  "profitUsdt",
  "lockedUsdt",
  "practiceUsdt",
  "liabilityUsdt",
  "expectedProfitUsdt",
  "todayPossibleProfitUsdt",
  "topSuggestDepositUsdt",
  "balanceUsdt",
  "amountUsdt",
  "feeUsdt",
]);

/** Count / quantity fields (unit = count). */
const QUANTITY_FIELDS = Object.freeze([
  "count",
  "claimableCount",
  "affordableCount",
  "nearMissCount",
  "lockedHighCount",
  "itemCount",
  "ledgerTotal",
  "settlementCompletedTodayCount",
  "uiConfirmations",
]);

/** Percent fields (rare in Fact tools; still grounded when present). */
const PERCENT_FIELDS = Object.freeze([
  "ratePercent",
  "feePercent",
  "spreadPercent",
]);

/**
 * Platform-relevant date/time fields in Fact *payload* (not fact-card envelope).
 * expires_at/captured_at on the card are freshness metadata — not calendar claims.
 */
const DATE_FIELDS = Object.freeze([
  "asOf",
  "endsAt",
  "ends_at",
  "startedAt",
  "started_at",
  "completedAt",
  "completed_at",
  "settleBy",
  "settle_by",
  "availableUntil",
  "available_until",
  "updatedAt",
  "updated_at",
  "createdAt",
  "created_at",
]);

/**
 * Tag a server-derived numeric (must be allowlisted derivationId).
 * @param {unknown} value
 * @param {string} derivationId
 */
function tagServerDerived(value, derivationId) {
  const id = String(derivationId || "");
  if (!ALLOWED_DERIVATION_IDS.has(id)) {
    throw new Error(`SERVER_DERIVED_NOT_ALLOWLISTED:${id}`);
  }
  if (value == null || value === "") {
    return Object.freeze({
      value: null,
      provenance: "server_derived",
      derivationId: id,
      availability: "unknown",
    });
  }
  return Object.freeze({
    value: normalizeScalar(value),
    provenance: "server_derived",
    derivationId: id,
    availability: isKnownZero(value) ? "known_zero" : "known",
  });
}

/**
 * Assert allowlist contract on a derived entry.
 * @param {object} entry
 */
function assertServerDerivedAllowlist(entry) {
  if (!entry || typeof entry !== "object") {
    throw new Error("SERVER_DERIVED_INVALID:not_object");
  }
  if (entry.provenance !== "server_derived") {
    throw new Error("SERVER_DERIVED_INVALID:provenance");
  }
  const id = String(entry.derivationId || "");
  if (!ALLOWED_DERIVATION_IDS.has(id)) {
    throw new Error(`SERVER_DERIVED_NOT_ALLOWLISTED:${id}`);
  }
  if (!Object.prototype.hasOwnProperty.call(entry, "value")) {
    throw new Error("SERVER_DERIVED_INVALID:missing_value");
  }
  return true;
}

function normalizeScalar(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim().replace(/,/g, "");
  return s === "" ? null : s;
}

function isKnownZero(v) {
  const n = normalizeScalar(v);
  if (n == null) return false;
  const num = Number(n);
  return Number.isFinite(num) && num === 0;
}

function valuesEqual(a, b) {
  const na = normalizeScalar(a);
  const nb = normalizeScalar(b);
  if (na == null || nb == null) return false;
  if (na === nb) return true;
  const fa = Number(na);
  const fb = Number(nb);
  if (Number.isFinite(fa) && Number.isFinite(fb)) return fa === fb;
  return false;
}

/**
 * Collect grounded numeric facts from Fact cards (+ optional nested provenance).
 * Null/unknown are preserved — never coerced to 0.
 *
 * @param {object[]} facts
 * @param {object} [opts]
 * @returns {readonly object[]}
 */
function collectGroundedNumerics(facts, opts = {}) {
  const list = Array.isArray(facts) ? facts : [];
  const out = [];
  const now = opts.now;

  for (const fact of list) {
    if (!fact || typeof fact !== "object") continue;
    const payload =
      fact.payload && typeof fact.payload === "object" ? fact.payload : {};
    const source = String(fact.source || "other");
    const fresh = isFactFresh(fact, { now });
    const freshness = fresh ? "fresh" : "stale";
    const asOf =
      payload.asOf ||
      fact.captured_at ||
      fact.capturedAt ||
      null;

    if (payload.unauthorized === true || payload.availability === "unauthorized") {
      out.push(
        Object.freeze({
          field: "_auth",
          value: null,
          kind: "currency",
          unit: null,
          currency: null,
          source,
          provenance: "fact",
          derivationId: null,
          asOf: asOf ? String(asOf) : null,
          freshness,
          availability: "unauthorized",
        }),
      );
      continue;
    }

    const nestedProv =
      payload.provenance && typeof payload.provenance === "object"
        ? payload.provenance
        : {};

    for (const field of CURRENCY_FIELDS) {
      pushField(out, {
        field,
        raw: payload[field],
        kind: "currency",
        unit: "USDT",
        currency: "USDT",
        source,
        asOf,
        freshness,
        nestedProv: nestedProv[field],
      });
    }
    for (const field of QUANTITY_FIELDS) {
      pushField(out, {
        field,
        raw: payload[field],
        kind: "quantity",
        unit: "count",
        currency: null,
        source,
        asOf,
        freshness,
        nestedProv: nestedProv[field],
      });
    }
    for (const field of PERCENT_FIELDS) {
      pushField(out, {
        field,
        raw: payload[field],
        kind: "percent",
        unit: "percent",
        currency: null,
        source,
        asOf,
        freshness,
        nestedProv: nestedProv[field],
      });
    }
    for (const field of DATE_FIELDS) {
      const raw = payload[field];
      if (raw == null || raw === "") continue;
      out.push(
        Object.freeze({
          field,
          value: String(raw),
          kind: "date",
          unit: "datetime",
          currency: null,
          source,
          provenance: "fact",
          derivationId: null,
          asOf: asOf ? String(asOf) : null,
          freshness,
          availability: freshness === "stale" ? "stale" : "known",
        }),
      );
    }
  }

  return Object.freeze(out.map((x) => Object.freeze(x)));
}

function pushField(out, spec) {
  const { field, raw, kind, unit, currency, source, asOf, freshness, nestedProv } =
    spec;
  // Only emit when key present on payload (caller passes raw from payload[field])
  if (raw === undefined) return;

  if (nestedProv && typeof nestedProv === "object") {
    tryAcceptDerived(out, {
      field,
      value: raw,
      meta: nestedProv,
      source,
      asOf,
      freshness,
      kind,
      unit,
      currency,
    });
    return;
  }

  if (raw == null || raw === "") {
    out.push({
      field,
      value: null,
      kind,
      unit,
      currency,
      source,
      provenance: "fact",
      derivationId: null,
      asOf: asOf ? String(asOf) : null,
      freshness,
      availability: "unknown",
    });
    return;
  }

  const zero = isKnownZero(raw);
  out.push({
    field,
    value: normalizeScalar(raw),
    kind,
    unit,
    currency,
    source,
    provenance: "fact",
    derivationId: null,
    asOf: asOf ? String(asOf) : null,
    freshness,
    availability: freshness === "stale" ? "stale" : zero ? "known_zero" : "known",
  });
}

function tryAcceptDerived(out, spec) {
  const { field, value, meta, source, asOf, freshness, kind, unit, currency } =
    spec;
  try {
    assertServerDerivedAllowlist({
      value,
      provenance: meta.provenance,
      derivationId: meta.derivationId,
    });
  } catch {
    // Untagged or non-allowlisted derivation → do not treat as grounded source
    if (value == null || value === "") {
      out.push({
        field,
        value: null,
        kind,
        unit,
        currency,
        source,
        provenance: "unsupported",
        derivationId: meta?.derivationId ? String(meta.derivationId) : null,
        asOf: asOf ? String(asOf) : null,
        freshness,
        availability: "unavailable",
      });
      return;
    }
    // Fall back to plain fact only if raw source value (not invented ROI)
    out.push({
      field,
      value: normalizeScalar(value),
      kind,
      unit,
      currency,
      source,
      provenance: "fact",
      derivationId: null,
      asOf: asOf ? String(asOf) : null,
      freshness,
      availability:
        freshness === "stale"
          ? "stale"
          : isKnownZero(value)
            ? "known_zero"
            : "known",
    });
    return;
  }

  if (value == null || value === "") {
    out.push({
      field,
      value: null,
      kind,
      unit,
      currency,
      source,
      provenance: "server_derived",
      derivationId: String(meta.derivationId),
      asOf: asOf ? String(asOf) : null,
      freshness,
      availability: "unknown",
    });
    return;
  }

  out.push({
    field,
    value: normalizeScalar(value),
    kind,
    unit,
    currency,
    source,
    provenance: "server_derived",
    derivationId: String(meta.derivationId),
    asOf: asOf ? String(asOf) : null,
    freshness,
    availability:
      freshness === "stale"
        ? "stale"
        : isKnownZero(value)
          ? "known_zero"
          : "known",
  });
}

/**
 * Prompt-safe grounded numeric context (known / known_zero / stale only).
 * Never invents zeros for unknown/unauthorized.
 *
 * @param {object[]} facts
 * @param {object} [opts]
 */
function buildGroundedNumericContext(facts, opts = {}) {
  const grounded = collectGroundedNumerics(facts, opts);
  const items = grounded.filter((g) =>
    ["known", "known_zero", "stale"].includes(g.availability),
  );
  const unauthorized = grounded.some((g) => g.availability === "unauthorized");
  return Object.freeze({
    schema: "grounded-numeric-context.v1",
    unauthorized,
    items: Object.freeze(items.map((g) => Object.freeze({ ...g }))),
  });
}

/**
 * Classify a numeric token in answer prose.
 * @param {object} claim
 */
function classifyNumericClaim(claim) {
  if (!claim || typeof claim !== "object") return "generic";
  if (claim.kind && NUMERIC_KINDS.includes(claim.kind)) return claim.kind;
  return "generic";
}

/**
 * Extract platform-relevant numeric claims from answer text.
 * Ordinals / bare generics / id_like are classified but not enforced.
 *
 * @param {string} answerText
 * @returns {readonly object[]}
 */
function extractNumericClaims(answerText) {
  const text = String(answerText || "");
  const claims = [];
  const seen = new Set();

  function add(claim) {
    const key = `${claim.kind}|${claim.value}|${claim.raw}`;
    if (seen.has(key)) return;
    seen.add(key);
    claims.push(Object.freeze(claim));
  }

  // UUID / id_like — exclude from grounding enforcement
  for (const m of text.matchAll(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  )) {
    add({
      kind: "id_like",
      value: m[0],
      raw: m[0],
      enforce: false,
    });
  }

  // Currency with unit / symbol
  const currencyRe =
    /(?:\$|USD|USDT|KRW|원)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:USDT|USD|KRW|원|달러|테더)/gi;
  for (const m of text.matchAll(currencyRe)) {
    const raw = m[0];
    const value = normalizeScalar(m[1] || m[2]);
    if (value == null) continue;
    let currency = "USDT";
    if (/KRW|원/.test(raw)) currency = "KRW";
    else if (/\$|USD/.test(raw) && !/USDT|테더/.test(raw)) currency = "USD";
    add({
      kind: "currency",
      value,
      raw,
      currency,
      unit: currency,
      enforce: true,
    });
  }

  // Percent
  for (const m of text.matchAll(
    /([\d,]+(?:\.\d+)?)\s*(?:%|퍼센트)|수익률\s*([\d,]+(?:\.\d+)?)/gi,
  )) {
    const value = normalizeScalar(m[1] || m[2]);
    if (value == null) continue;
    add({
      kind: "percent",
      value,
      raw: m[0],
      unit: "percent",
      enforce: true,
    });
  }

  // Unit-bound quantity (건/개/명/회)
  for (const m of text.matchAll(/([\d,]+)\s*(건|개|명|회)/g)) {
    const value = normalizeScalar(m[1]);
    if (value == null) continue;
    add({
      kind: "quantity",
      value,
      raw: m[0],
      unit: "count",
      enforce: true,
    });
  }

  // Dates — platform-relevant (never categorical exclude)
  for (const m of text.matchAll(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일|(\d{4})-(\d{2})-(\d{2})|(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
  )) {
    add({
      kind: "date",
      value: m[0],
      raw: m[0],
      unit: "datetime",
      enforce: true,
      parts: {
        month: m[1] || m[4] || m[7] || null,
        day: m[2] || m[5] || m[8] || null,
        year: m[3] || m[6] || null,
      },
    });
  }

  // Ordinals — exclude from enforcement
  for (const m of text.matchAll(
    /(?:첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|그중\s*(?:첫|두|세)|(\d+)\s*번째)/g,
  )) {
    add({
      kind: "ordinal",
      value: m[1] ? normalizeScalar(m[1]) : m[0],
      raw: m[0],
      enforce: false,
    });
  }

  return Object.freeze(claims);
}

function hasDateFacts(grounded) {
  return grounded.some(
    (g) =>
      g.kind === "date" &&
      (g.availability === "known" || g.availability === "stale"),
  );
}

function dateMatchesFact(claim, grounded) {
  const dates = grounded.filter(
    (g) =>
      g.kind === "date" &&
      g.value != null &&
      (g.availability === "known" || g.availability === "stale"),
  );
  if (!dates.length) return false;
  const raw = String(claim.raw || claim.value || "");
  for (const d of dates) {
    const fv = String(d.value);
    if (fv.includes(raw) || raw.includes(fv.slice(0, 10))) return true;
    // Korean "M월 D일" vs ISO
    const iso = fv.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso && claim.parts) {
      const mm = String(Number(iso[2]));
      const dd = String(Number(iso[3]));
      const cm = claim.parts.month ? String(Number(claim.parts.month)) : null;
      const cd = claim.parts.day ? String(Number(claim.parts.day)) : null;
      if (cm && cd && cm === mm && cd === dd) return true;
    }
  }
  return false;
}

function claimGrounded(claim, grounded) {
  if (claim.kind === "date") {
    if (!hasDateFacts(grounded)) return false;
    return dateMatchesFact(claim, grounded);
  }

  const candidates = grounded.filter((g) => {
    if (g.availability === "unauthorized") return false;
    if (g.availability === "unknown" || g.availability === "unavailable") {
      return false;
    }
    if (g.value == null) return false;
    if (claim.kind === "currency") {
      if (g.kind !== "currency") return false;
      if (
        claim.currency &&
        g.currency &&
        claim.currency !== g.currency &&
        // USDT answers may say USD loosely — still require same family from fact
        !(claim.currency === "USD" && g.currency === "USDT")
      ) {
        return false;
      }
      return valuesEqual(claim.value, g.value);
    }
    if (claim.kind === "percent") {
      return g.kind === "percent" && valuesEqual(claim.value, g.value);
    }
    if (claim.kind === "quantity") {
      return g.kind === "quantity" && valuesEqual(claim.value, g.value);
    }
    return false;
  });
  return candidates.length > 0;
}

/**
 * Deterministic grounding decision for a P / llm_p answer.
 *
 * @param {object} input
 * @param {string} input.answerText
 * @param {object[]} [input.factsUsed]
 * @param {"P"|"G"|"S"} [input.lane]
 * @param {string} [input.answerPath]
 * @returns {Readonly<{status:string, pass:boolean, reason?:string, claims:object[], grounded:object[], decision:string}>}
 */
function groundAnswerNumerics(input = {}) {
  const lane = String(input.lane || "");
  const answerPath = String(input.answerPath || input.answer_path || "");
  const answerText = String(input.answerText || input.answer_text || "");
  const facts = Array.isArray(input.factsUsed || input.facts_used)
    ? input.factsUsed || input.facts_used
    : [];

  // Canonical: inspect P · llm_p only
  if (lane !== "P" || answerPath !== "llm_p") {
    return Object.freeze({
      status: "pass",
      pass: true,
      reason: "skipped_non_llm_p",
      claims: Object.freeze([]),
      grounded: Object.freeze([]),
      decision: "skip",
    });
  }

  const grounded = collectGroundedNumerics(facts, { now: input.now });
  if (grounded.some((g) => g.availability === "unauthorized")) {
    const claims = extractNumericClaims(answerText);
    const enforced = claims.filter((c) => c.enforce);
    if (enforced.length > 0) {
      return Object.freeze({
        status: "ungrounded",
        pass: false,
        reason: "unauthorized_numeric_claim",
        claims,
        grounded,
        decision: "block_unauthorized",
      });
    }
  }

  const claims = extractNumericClaims(answerText);
  const violations = [];

  for (const claim of claims) {
    const kind = classifyNumericClaim(claim);
    if (!claim.enforce) continue;

    if (kind === "date") {
      if (!hasDateFacts(grounded)) {
        violations.push({
          claim,
          reason: "unsupported_date_without_fact",
        });
        continue;
      }
      if (!dateMatchesFact(claim, grounded)) {
        violations.push({ claim, reason: "date_mismatch" });
      }
      continue;
    }

    if (kind === "percent") {
      const hasPercentFact = grounded.some(
        (g) =>
          g.kind === "percent" &&
          (g.availability === "known" ||
            g.availability === "known_zero" ||
            g.availability === "stale"),
      );
      if (!hasPercentFact || !claimGrounded(claim, grounded)) {
        violations.push({
          claim,
          reason: "ungrounded_percent_or_roi",
        });
      }
      continue;
    }

    if (kind === "currency" || kind === "quantity") {
      if (!claimGrounded(claim, grounded)) {
        violations.push({
          claim,
          reason: `ungrounded_${kind}`,
        });
      }
    }
  }

  // Cross-currency sum invention: answer that adds mixed currencies without facts
  if (/합치면|합계|더하면/.test(answerText)) {
    const currencies = new Set(
      claims
        .filter((c) => c.kind === "currency" && c.currency)
        .map((c) => c.currency),
    );
    if (currencies.size > 1) {
      violations.push({
        claim: { kind: "currency", value: null, raw: "mixed_sum" },
        reason: "cross_currency_sum_forbidden",
      });
    }
  }

  if (violations.length) {
    const first = violations[0];
    return Object.freeze({
      status: "ungrounded",
      pass: false,
      reason: first.reason,
      claims,
      grounded,
      violations: Object.freeze(violations),
      decision: "ungrounded",
    });
  }

  return Object.freeze({
    status: "pass",
    pass: true,
    reason: "grounded",
    claims,
    grounded,
    decision: "pass",
  });
}

/**
 * Forbidden: invent ROI / expected return without source percent fact.
 * Deterministic check used by verify matrix.
 */
function isForbiddenDerivedRoi(answerText, factsUsed) {
  const r = groundAnswerNumerics({
    lane: "P",
    answerPath: "llm_p",
    answerText,
    factsUsed,
  });
  return (
    !r.pass &&
    (r.reason === "ungrounded_percent_or_roi" ||
      String(r.reason || "").includes("percent"))
  );
}

module.exports = {
  SERVER_DERIVED_ALLOWLIST,
  ALLOWED_DERIVATION_IDS,
  NUMERIC_KINDS,
  AVAILABILITIES,
  CURRENCY_FIELDS,
  QUANTITY_FIELDS,
  PERCENT_FIELDS,
  DATE_FIELDS,
  tagServerDerived,
  assertServerDerivedAllowlist,
  collectGroundedNumerics,
  buildGroundedNumericContext,
  extractNumericClaims,
  classifyNumericClaim,
  groundAnswerNumerics,
  isForbiddenDerivedRoi,
  normalizeScalar,
  valuesEqual,
  isKnownZero,
};
