/**
 * CanonicalProduct ↔ durable storage record mapper.
 * Domain owner = contract. DB row ≠ domain object.
 */

const { buildCanonicalIdentityKey } = require("./identity.cjs");
const { FORBIDDEN_ON_LINK } = require("./contract.cjs");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJsonb(value, label, failures) {
  if (value == null) {
    failures.push(`${label}_missing`);
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      failures.push(`${label}_json_invalid`);
      return null;
    }
  }
  if (!isPlainObject(value) && !Array.isArray(value)) {
    failures.push(`${label}_not_object`);
    return null;
  }
  return value;
}

function sameText(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function stableJson(value) {
  return JSON.stringify(value ?? null);
}

function pickDomainProduct(product) {
  return {
    canonicalProductId: product.canonicalProductId,
    putdukProductCode: product.putdukProductCode,
    categoryProfile: product.categoryProfile,
    canonicalAttributes: { ...(product.canonicalAttributes || {}) },
    variants: Array.isArray(product.variants) ? product.variants.slice() : [],
    identityEvidenceSummary: { ...(product.identityEvidenceSummary || {}) },
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function toPersistenceRecord(product, identityKey) {
  if (!product || !identityKey) {
    return { ok: false, reason: "PERSISTED_CANONICAL_PRODUCT_PAYLOAD_CONFLICT", failures: ["record_input"] };
  }
  const payload = pickDomainProduct(product);
  const key = buildCanonicalIdentityKey(payload.categoryProfile, payload.canonicalAttributes);
  if (!key.ok || key.key !== identityKey) {
    return {
      ok: false,
      reason: "PERSISTED_CANONICAL_PRODUCT_PAYLOAD_CONFLICT",
      failures: ["identity_key_mismatch"],
    };
  }
  return {
    ok: true,
    record: {
      canonical_product_id: payload.canonicalProductId,
      putduk_product_code: payload.putdukProductCode,
      category_profile: payload.categoryProfile,
      canonical_identity_key: identityKey,
      canonical_attributes: payload.canonicalAttributes,
      identity_evidence_summary: payload.identityEvidenceSummary,
      payload,
      created_at: payload.createdAt,
      updated_at: payload.updatedAt,
    },
  };
}

function fromPersistenceRecord(record) {
  if (!record || !isPlainObject(record)) {
    return {
      ok: false,
      reason: "PERSISTED_CANONICAL_PRODUCT_PAYLOAD_CONFLICT",
      failures: ["record_not_object"],
    };
  }

  const failures = [];
  const payload = parseJsonb(record.payload, "payload", failures);
  const attrs = parseJsonb(record.canonical_attributes, "canonical_attributes", failures);
  const evidence = parseJsonb(record.identity_evidence_summary, "identity_evidence_summary", failures);
  if (failures.length) {
    return { ok: false, reason: "PERSISTED_CANONICAL_PRODUCT_PAYLOAD_CONFLICT", failures };
  }

  if (!sameText(record.canonical_product_id, payload.canonicalProductId)) {
    failures.push("canonical_product_id_mismatch");
  }
  if (!sameText(record.putduk_product_code, payload.putdukProductCode)) {
    failures.push("putduk_product_code_mismatch");
  }
  if (!sameText(record.category_profile, payload.categoryProfile)) {
    failures.push("category_profile_mismatch");
  }
  if (stableJson(attrs) !== stableJson(payload.canonicalAttributes)) {
    failures.push("canonical_attributes_payload_mismatch");
  }
  if (stableJson(evidence) !== stableJson(payload.identityEvidenceSummary)) {
    failures.push("identity_evidence_summary_payload_mismatch");
  }

  const rebuilt = buildCanonicalIdentityKey(
    record.category_profile,
    payload.canonicalAttributes || attrs,
  );
  if (!rebuilt.ok || rebuilt.key !== String(record.canonical_identity_key)) {
    failures.push("canonical_identity_key_mismatch");
  }

  if (failures.length) {
    return { ok: false, reason: "PERSISTED_CANONICAL_PRODUCT_PAYLOAD_CONFLICT", failures };
  }

  return {
    ok: true,
    identityKey: rebuilt.key,
    product: pickDomainProduct({
      canonicalProductId: payload.canonicalProductId,
      putdukProductCode: payload.putdukProductCode,
      categoryProfile: payload.categoryProfile,
      canonicalAttributes: payload.canonicalAttributes,
      variants: payload.variants,
      identityEvidenceSummary: payload.identityEvidenceSummary,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    }),
  };
}

function stripForbiddenLinkFields(link) {
  const stored = { ...link };
  for (const field of FORBIDDEN_ON_LINK) {
    delete stored[field];
  }
  return stored;
}

function toLinkRecord(canonicalProductId, link) {
  const stored = stripForbiddenLinkFields({ ...link, canonicalProductId });
  return {
    canonical_product_id: stored.canonicalProductId,
    source: stored.source,
    source_item_id: stored.sourceItemId,
    source_url: stored.sourceUrl || null,
    latest_observation_ref: stored.latestObservationRef,
    matching_decision: stored.matchingDecision,
    matcher_version: stored.matcherVersion,
    evidence: stored.evidence || {},
  };
}

function fromLinkRecord(record) {
  if (!record || !isPlainObject(record)) {
    return { ok: false, reason: "LINK_PAYLOAD_CONFLICT", failures: ["link_record_not_object"] };
  }
  const evidence = typeof record.evidence === "string" ? JSON.parse(record.evidence) : record.evidence;
  const link = stripForbiddenLinkFields({
    canonicalProductId: record.canonical_product_id,
    source: record.source,
    sourceItemId: record.source_item_id,
    sourceUrl: record.source_url,
    latestObservationRef: record.latest_observation_ref,
    matchingDecision: record.matching_decision,
    matcherVersion: record.matcher_version,
    evidence: evidence || {},
  });
  return { ok: true, link };
}

module.exports = {
  pickDomainProduct,
  toPersistenceRecord,
  fromPersistenceRecord,
  stripForbiddenLinkFields,
  toLinkRecord,
  fromLinkRecord,
};
