/**
 * SourceObservation ↔ durable storage record mapper.
 * Domain owner = contract. DB row ≠ domain object.
 */

const crypto = require("node:crypto");
const { validateObservation } = require("./validate.cjs");

const CANONICAL_KEYS = Object.freeze([
  "id",
  "source",
  "externalItemId",
  "url",
  "title",
  "imageUrl",
  "imageAlt",
  "nativeAmount",
  "nativeCurrency",
  "observedAt",
  "fetchedAt",
  "observationPurpose",
  "sourceStatus",
  "parserVersion",
  "availability",
  "displayAuthorized",
  "lastSuccessAt",
  "lastFailureAt",
  "failureReason",
  "meta",
]);

const META_KEYS = Object.freeze([
  "priceKind",
  "brand",
  "model",
  "modelNumber",
  "sku",
  "variant",
  "condition",
  "size",
  "grade",
  "categoryHint",
  "variantResolution",
  "localizedAmount",
  "localizedCurrency",
  "priceSemantics",
  "observationMode",
  "identityHints",
  "extractionEvidence",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeForFingerprint(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const next = normalizeForFingerprint(item);
      return next === undefined ? null : next;
    });
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const next = normalizeForFingerprint(value[key]);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return String(value);
}

function pickCanonicalObservation(obs) {
  const out = {};
  for (const key of CANONICAL_KEYS) {
    if (obs && obs[key] !== undefined) out[key] = obs[key];
  }
  if (out.meta && isPlainObject(out.meta)) {
    const meta = {};
    for (const key of META_KEYS) {
      if (out.meta[key] !== undefined) meta[key] = out.meta[key];
    }
    out.meta = meta;
  }
  return out;
}

function stableSerialize(value) {
  return JSON.stringify(normalizeForFingerprint(value));
}

/**
 * caller fingerprint 사용 금지. validated canonical payload에서만 계산.
 * @param {object} observation
 */
function fingerprintCanonicalObservation(observation) {
  const canonical = pickCanonicalObservation(observation);
  return crypto.createHash("sha256").update(stableSerialize(canonical)).digest("hex");
}

function sameInstant(left, right) {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  const a = left instanceof Date ? left.toISOString() : String(left);
  const b = right instanceof Date ? right.toISOString() : String(right);
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return ta === tb;
}

function toPersistenceRecord(observation) {
  const checked = validateObservation(observation);
  if (!checked.ok) return checked;
  const payload = pickCanonicalObservation(checked.observation);
  return {
    ok: true,
    record: {
      id: payload.id,
      source: payload.source,
      external_item_id: payload.externalItemId,
      observation_purpose: payload.observationPurpose,
      source_status: payload.sourceStatus,
      url: payload.url,
      observed_at: payload.observedAt,
      payload,
      content_fingerprint: fingerprintCanonicalObservation(payload),
    },
  };
}

function fromPersistenceRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {
      ok: false,
      reason: "PERSISTED_RECORD_PAYLOAD_CONFLICT",
      failures: ["record_not_object"],
    };
  }

  let payload = record.payload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return {
        ok: false,
        reason: "PERSISTED_RECORD_PAYLOAD_CONFLICT",
        failures: ["payload_json_invalid"],
      };
    }
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      reason: "PERSISTED_RECORD_PAYLOAD_CONFLICT",
      failures: ["payload_not_object"],
    };
  }

  const failures = [];
  if (String(record.id) !== String(payload.id)) failures.push("id_mismatch");
  if (String(record.source) !== String(payload.source)) failures.push("source_mismatch");
  if (String(record.external_item_id) !== String(payload.externalItemId)) {
    failures.push("externalItemId_mismatch");
  }
  if (String(record.observation_purpose) !== String(payload.observationPurpose)) {
    failures.push("observationPurpose_mismatch");
  }
  if (String(record.source_status) !== String(payload.sourceStatus)) {
    failures.push("sourceStatus_mismatch");
  }
  if (String(record.url) !== String(payload.url)) failures.push("url_mismatch");
  if (!sameInstant(record.observed_at, payload.observedAt)) failures.push("observedAt_mismatch");

  if (failures.length) {
    return { ok: false, reason: "PERSISTED_RECORD_PAYLOAD_CONFLICT", failures };
  }

  const checked = validateObservation(payload);
  if (!checked.ok) {
    return {
      ok: false,
      reason: "PERSISTED_RECORD_PAYLOAD_CONFLICT",
      failures: checked.failures || [checked.reason],
    };
  }
  return { ok: true, observation: pickCanonicalObservation(checked.observation) };
}

module.exports = {
  CANONICAL_KEYS,
  META_KEYS,
  pickCanonicalObservation,
  fingerprintCanonicalObservation,
  stableSerialize,
  toPersistenceRecord,
  fromPersistenceRecord,
};
