/**
 * Canonical identity key ≠ canonicalAttributes 전체.
 * 키 필드는 Generic Product Profile plugin이 고른다.
 * title / image / price / source-local / PD / optional enrichment 금지.
 */

const {
  asString,
  normalizeText,
  normalizeIdentifierValue,
} = require("../identity-matching/normalize.cjs");
const {
  assemblePairEvidence,
  pickField,
  isOwner,
  OWNER_BACKED_STRUCTURED,
} = require("../identity-matching/v2/evidence.cjs");
const { FORBIDDEN_IDENTITY_KEY_FIELDS } = require("./contract.cjs");
const {
  identityKeyFieldsForProfile,
  optionalEnrichmentFieldsFor,
  resolveGenericProfile,
} = require("./generic-profile.cjs");

const EVIDENCE_FIELD_TO_ATTR = Object.freeze({
  game: "game",
  set: "set",
  cardNumber: "cardNumber",
  character: "characterOrName",
  language: "language",
  finish: "finishOrEdition",
  brand: "brand",
  manufacturerStyleCode: "manufacturerStyleCode",
  manufacturerReference: "manufacturerReference",
  model: "model",
  color: "color",
  colorway: "colorway",
  size: "size",
  material: "material",
});

function identityKeyFieldsFor(categoryProfile) {
  return identityKeyFieldsForProfile(categoryProfile);
}

function normalizeIdentityValue(field, value) {
  if (
    field === "cardNumber" ||
    field === "manufacturerStyleCode" ||
    field === "manufacturerReference"
  ) {
    return normalizeIdentifierValue(value);
  }
  return normalizeText(value);
}

function buildCanonicalIdentityKey(categoryProfile, canonicalAttributes) {
  const resolved = resolveGenericProfile(categoryProfile);
  const fields = resolved.ok ? resolved.plugin.identityKeyFields.slice() : null;
  if (!fields) {
    return {
      ok: false,
      reason: resolved.reason,
      key: null,
      fields: [],
    };
  }

  const attrs =
    canonicalAttributes && typeof canonicalAttributes === "object"
      ? canonicalAttributes
      : {};

  const parts = [`profile=${asString(categoryProfile)}`];
  for (const field of fields) {
    if (FORBIDDEN_IDENTITY_KEY_FIELDS.includes(field)) {
      return {
        ok: false,
        reason: "FORBIDDEN_IDENTITY_KEY_FIELD",
        key: null,
        fields,
        missingField: field,
      };
    }
    const norm = normalizeIdentityValue(field, attrs[field]);
    if (!norm) {
      return {
        ok: false,
        reason: "IDENTITY_KEY_INCOMPLETE",
        key: null,
        fields,
        missingField: field,
      };
    }
    parts.push(`${field}=${norm}`);
  }

  return {
    ok: true,
    reason: null,
    key: parts.join("|"),
    fields,
  };
}

function preferStructuredSide(left, right) {
  if (isOwner(left)) return left;
  if (isOwner(right)) return right;
  if (left && asString(left.value)) return left;
  if (right && asString(right.value)) return right;
  return null;
}

function agreedValue(row, pair, attrField, identityFields, enrichmentFields) {
  if (row && row.comparison === "mismatch") return null;

  if (row && row.comparison === "exact") {
    const chosen = preferStructuredSide(row.left, row.right);
    if (chosen && asString(chosen.value)) return asString(chosen.value);
  }

  if (
    pair.left &&
    pair.right &&
    pair.left.normalizedValue &&
    pair.left.normalizedValue === pair.right.normalizedValue
  ) {
    const chosen = preferStructuredSide(pair.left, pair.right);
    if (chosen && asString(chosen.value)) return asString(chosen.value);
  }

  if (identityFields.includes(attrField)) {
    const chosen = preferStructuredSide(pair.left, pair.right);
    if (
      chosen &&
      chosen.evidenceOwner === OWNER_BACKED_STRUCTURED &&
      asString(chosen.value)
    ) {
      return asString(chosen.value);
    }
    if (chosen && asString(chosen.value) && chosen.evidenceOwner) {
      return asString(chosen.value);
    }
  }

  if ((enrichmentFields || []).includes(attrField)) {
    const chosen = preferStructuredSide(pair.left, pair.right);
    if (chosen && asString(chosen.value)) return asString(chosen.value);
  }

  return null;
}

function promoteCanonicalAttributes({ left, right, matchResult }) {
  const assembled = assemblePairEvidence(left, right, {});
  const evidence = (matchResult && matchResult.evidence) || [];
  const identityFields = identityKeyFieldsFor(assembled.pairProfile) || [];
  const enrichmentFields = optionalEnrichmentFieldsFor(assembled.pairProfile);
  const attributes = {};

  for (const [evidenceField, attrField] of Object.entries(EVIDENCE_FIELD_TO_ATTR)) {
    const row = evidence.find((item) => item.field === evidenceField);
    const pair = {
      left: pickField(assembled.left, evidenceField),
      right: pickField(assembled.right, evidenceField),
    };
    const value = agreedValue(row, pair, attrField, identityFields, enrichmentFields);
    if (value) attributes[attrField] = value;
  }

  delete attributes.title;
  delete attributes.image;
  delete attributes.imageUrl;
  delete attributes.price;
  delete attributes.sourceItemId;
  delete attributes.externalItemId;
  delete attributes.putdukProductCode;

  return {
    categoryProfile: assembled.pairProfile,
    canonicalAttributes: attributes,
  };
}

module.exports = {
  identityKeyFieldsFor,
  buildCanonicalIdentityKey,
  promoteCanonicalAttributes,
};
