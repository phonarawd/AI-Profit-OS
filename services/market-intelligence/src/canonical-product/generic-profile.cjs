/**
 * Generic Product Profile — 범용 identity architecture + category plugin.
 * 카드/시계/가방 전용 구조가 아니다. Founder가 카테고리를 추가해도 코어는 유지한다.
 * MATCH 프로파일 정의를 재설계하지 않는다. identity key / variant / listing 역할만 고정한다.
 */

const GENERIC_PRODUCT_PROFILE_STATUS = "PASS";
const GENERIC_ARCHITECTURE = "UNIVERSAL_FIELDS_PLUS_CATEGORY_PLUGINS";
const FOUNDER_CAN_CHANGE_LATER = true;

const GENERIC_PROFILE_REASONS = Object.freeze({
  UNSUPPORTED: "GENERIC_PRODUCT_PROFILE_UNSUPPORTED",
  DEFERRED: "GENERIC_PRODUCT_PROFILE_DEFERRED",
});

const UNIVERSAL_FIELD_CATALOG = Object.freeze([
  "brand",
  "manufacturer",
  "model",
  "productName",
  "category",
  "gtin",
  "upc",
  "ean",
  "mpn",
  "variant",
  "color",
  "size",
  "capacity",
  "condition",
  "structuredAttributes",
  "images",
]);

const FIELD_ROLES = Object.freeze({
  IDENTITY_KEY: "IDENTITY_KEY",
  OPTIONAL_ENRICHMENT: "OPTIONAL_ENRICHMENT",
  VARIANT: "VARIANT",
  LISTING_NOT_IDENTITY: "LISTING_NOT_IDENTITY",
  PRESENTATION_ONLY: "PRESENTATION_ONLY",
  TYPED_IDENTIFIER_EVIDENCE: "TYPED_IDENTIFIER_EVIDENCE",
  SOURCE_LOCAL_ONLY: "SOURCE_LOCAL_ONLY",
  FORBIDDEN: "FORBIDDEN",
});

const MVP_CATEGORY_PROFILES = Object.freeze([
  "sneakers",
  "trading_card",
  "watch",
  "luxury_bag",
]);

const DEFERRED_CATEGORY_PROFILES = Object.freeze([
  "electronics",
  "general_goods",
]);

const UNIVERSAL_TYPED_IDENTIFIER_EVIDENCE = Object.freeze([
  "gtin",
  "upc",
  "ean",
  "mpn",
]);

const UNIVERSAL_PRESENTATION_ONLY = Object.freeze([
  "productName",
  "title",
  "images",
  "image",
  "imageUrl",
]);

const UNIVERSAL_LISTING_NOT_IDENTITY = Object.freeze(["condition"]);

function plugin({
  identityKeyFields,
  optionalEnrichmentFields,
  variantFields,
  structuredAttributeFields,
}) {
  return Object.freeze({
    identityKeyFields: Object.freeze(identityKeyFields.slice()),
    optionalEnrichmentFields: Object.freeze(optionalEnrichmentFields.slice()),
    variantFields: Object.freeze(variantFields.slice()),
    listingNotIdentityFields: UNIVERSAL_LISTING_NOT_IDENTITY,
    presentationOnlyFields: UNIVERSAL_PRESENTATION_ONLY,
    typedIdentifierEvidenceFields: UNIVERSAL_TYPED_IDENTIFIER_EVIDENCE,
    structuredAttributeFields: Object.freeze(
      (structuredAttributeFields || []).slice(),
    ),
  });
}

const CATEGORY_PLUGINS = Object.freeze({
  trading_card: plugin({
    identityKeyFields: ["game", "set", "cardNumber", "characterOrName"],
    optionalEnrichmentFields: ["language", "finishOrEdition"],
    variantFields: ["grade"],
    structuredAttributeFields: ["game", "set", "cardNumber", "characterOrName"],
  }),
  sneakers: plugin({
    identityKeyFields: ["brand", "manufacturerStyleCode"],
    optionalEnrichmentFields: ["model", "colorway"],
    variantFields: ["size"],
    structuredAttributeFields: ["manufacturerStyleCode"],
  }),
  watch: plugin({
    identityKeyFields: ["brand", "manufacturerReference"],
    optionalEnrichmentFields: ["model", "caseSize", "dial", "material"],
    variantFields: [],
    structuredAttributeFields: ["manufacturerReference"],
  }),
  luxury_bag: plugin({
    identityKeyFields: ["brand", "model", "size", "color"],
    optionalEnrichmentFields: ["material"],
    variantFields: [],
    structuredAttributeFields: ["model", "size", "color", "material"],
  }),
});

function asProfileName(categoryProfile) {
  return String(categoryProfile || "").trim();
}

function resolveGenericProfile(categoryProfile) {
  const name = asProfileName(categoryProfile);
  if (CATEGORY_PLUGINS[name]) {
    return {
      ok: true,
      reason: null,
      status: GENERIC_PRODUCT_PROFILE_STATUS,
      categoryProfile: name,
      plugin: CATEGORY_PLUGINS[name],
    };
  }
  if (DEFERRED_CATEGORY_PROFILES.includes(name)) {
    return {
      ok: false,
      reason: GENERIC_PROFILE_REASONS.DEFERRED,
      status: GENERIC_PRODUCT_PROFILE_STATUS,
      categoryProfile: name,
      plugin: null,
    };
  }
  return {
    ok: false,
    reason: GENERIC_PROFILE_REASONS.UNSUPPORTED,
    status: GENERIC_PRODUCT_PROFILE_STATUS,
    categoryProfile: name || "unknown",
    plugin: null,
  };
}

function identityKeyFieldsForProfile(categoryProfile) {
  const resolved = resolveGenericProfile(categoryProfile);
  if (!resolved.ok) return null;
  return resolved.plugin.identityKeyFields.slice();
}

function optionalEnrichmentFieldsFor(categoryProfile) {
  const resolved = resolveGenericProfile(categoryProfile);
  if (!resolved.ok) return [];
  return resolved.plugin.optionalEnrichmentFields.slice();
}

function variantFieldsFor(categoryProfile) {
  const resolved = resolveGenericProfile(categoryProfile);
  if (!resolved.ok) return [];
  return resolved.plugin.variantFields.slice();
}

function isGenericProfileFailClosedReason(reason) {
  return (
    reason === GENERIC_PROFILE_REASONS.UNSUPPORTED ||
    reason === GENERIC_PROFILE_REASONS.DEFERRED ||
    reason === "GENERIC_PRODUCT_PROFILE_NOT_IMPLEMENTED"
  );
}

module.exports = {
  GENERIC_PRODUCT_PROFILE_STATUS,
  GENERIC_ARCHITECTURE,
  FOUNDER_CAN_CHANGE_LATER,
  GENERIC_PROFILE_REASONS,
  UNIVERSAL_FIELD_CATALOG,
  FIELD_ROLES,
  MVP_CATEGORY_PROFILES,
  DEFERRED_CATEGORY_PROFILES,
  CATEGORY_PLUGINS,
  resolveGenericProfile,
  identityKeyFieldsForProfile,
  optionalEnrichmentFieldsFor,
  variantFieldsFor,
  isGenericProfileFailClosedReason,
};
