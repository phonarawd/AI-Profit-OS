/**
 * Listing 뷰 추출.
 * title/image/price는 호환 판정 owner가 아니다.
 * grade만 Engine card-grade 정규화·title 추출을 재사용한다.
 */

const {
  asString,
  normalizeText,
  normalizeIdentifierValue,
} = require("../identity-matching/normalize.cjs");
const { resolveSingleProfileV2 } = require("../identity-matching/v2/evidence.cjs");
const {
  resolveGenericProfile,
  MVP_CATEGORY_PROFILES,
  DEFERRED_CATEGORY_PROFILES,
} = require("../canonical-product/generic-profile.cjs");
const {
  normalizeGradeToken,
  extractGradeFromText,
} = require("../card-grade.cjs");

const MVP = new Set(MVP_CATEGORY_PROFILES);
const DEFERRED = new Set(DEFERRED_CATEGORY_PROFILES);

const FIELD_ALIASES = Object.freeze({
  characterOrName: ["characterOrName", "character", "name"],
  manufacturerStyleCode: ["manufacturerStyleCode", "styleCode"],
  manufacturerReference: ["manufacturerReference", "reference"],
  cardNumber: ["cardNumber", "number"],
  grade: ["grade", "gradeDeclared"],
  color: ["color"],
  colorway: ["colorway"],
  size: ["size"],
  game: ["game"],
  set: ["set"],
  brand: ["brand"],
  model: ["model"],
  material: ["material"],
  condition: ["condition"],
});

const TOP_LEVEL_ALLOWED = new Set([
  "brand",
  "model",
  "game",
  "set",
  "cardNumber",
  "characterOrName",
  "manufacturerStyleCode",
  "manufacturerReference",
  "size",
  "color",
  "colorway",
  "grade",
  "material",
  "condition",
]);

function metaOf(input) {
  return input && input.meta && typeof input.meta === "object" ? input.meta : {};
}

function hintsOf(input) {
  const meta = metaOf(input);
  return meta.identityHints && typeof meta.identityHints === "object"
    ? meta.identityHints
    : {};
}

function objectOf(value) {
  return value && typeof value === "object" ? value : {};
}

function firstString(values) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return "";
}

function resolveListingProfile(input) {
  const hints = hintsOf(input);
  const explicit = asString(
    input.categoryProfile || hints.categoryProfile || objectOf(input.identity).categoryProfile,
  );
  if (DEFERRED.has(explicit)) {
    return { profile: explicit, deferred: true, unsupported: false };
  }
  if (MVP.has(explicit)) {
    return { profile: explicit, deferred: false, unsupported: false };
  }
  if (explicit) {
    return { profile: explicit, deferred: false, unsupported: true };
  }

  if (input.meta || input.observationPurpose || input.sourceStatus) {
    const resolved = resolveSingleProfileV2(input);
    if (MVP.has(resolved)) {
      return { profile: resolved, deferred: false, unsupported: false };
    }
    return { profile: resolved || "unknown", deferred: false, unsupported: false };
  }

  return { profile: "unknown", deferred: false, unsupported: false };
}

function pairProfile(left, right) {
  if (left.unsupported || right.unsupported) {
    return left.unsupported ? left.profile : right.profile;
  }
  if (MVP.has(left.profile) && left.profile === right.profile) return left.profile;
  if (MVP.has(left.profile) && (right.profile === "unknown" || right.deferred)) {
    return left.profile;
  }
  if (MVP.has(right.profile) && (left.profile === "unknown" || left.deferred)) {
    return right.profile;
  }
  if (left.profile === right.profile && left.profile) return left.profile;
  return "unknown";
}

function profilesConflict(left, right) {
  return Boolean(
    MVP.has(left.profile) && MVP.has(right.profile) && left.profile !== right.profile,
  );
}

function isObservationShaped(input) {
  return Boolean(
    asString(input && input.observationPurpose) || asString(input && input.sourceStatus),
  );
}

function isEligibleListing(input) {
  if (!isObservationShaped(input)) return true;
  return (
    asString(input.observationPurpose) === "CONFIRMATION" &&
    asString(input.sourceStatus) === "SUCCESS"
  );
}

function normalizeFieldValue(field, raw) {
  if (!raw) return "";
  if (field === "grade") return normalizeGradeToken(raw);
  if (
    field === "cardNumber" ||
    field === "manufacturerStyleCode" ||
    field === "manufacturerReference"
  ) {
    return normalizeIdentifierValue(raw);
  }
  return normalizeText(raw);
}

function readStructuredRaw(input, field) {
  const identity = objectOf(input.identity);
  const variants = objectOf(input.variants);
  const meta = metaOf(input);
  const hints = hintsOf(input);
  const aliases = FIELD_ALIASES[field] || [field];
  const values = [];
  for (const alias of aliases) {
    values.push(identity[alias], variants[alias], hints[alias], meta[alias]);
    if (TOP_LEVEL_ALLOWED.has(alias)) values.push(input[alias]);
  }
  return firstString(values);
}

function readField(input, field) {
  const structured = readStructuredRaw(input, field);
  if (structured) {
    return {
      value: structured,
      normalizedValue: normalizeFieldValue(field, structured),
      evidenceOwner: "OWNER_BACKED_STRUCTURED",
      derivedFrom: null,
    };
  }

  if (field === "grade") {
    const extracted = extractGradeFromText(input.title);
    if (extracted.found && extracted.normalized) {
      return {
        value: extracted.normalized,
        normalizedValue: normalizeGradeToken(extracted.normalized),
        evidenceOwner: "DERIVED_STRUCTURED",
        derivedFrom: "title",
      };
    }
  }

  return null;
}

function extractListingView(input) {
  const row = input && typeof input === "object" ? input : {};
  const profileInfo = resolveListingProfile(row);
  const resolved = resolveGenericProfile(profileInfo.profile);
  const plugin = resolved.ok ? resolved.plugin : null;
  const identityFields = plugin ? plugin.identityKeyFields.slice() : [];
  const variantFields = plugin ? plugin.variantFields.slice() : [];

  const identity = {};
  for (const field of identityFields) {
    const hit = readField(row, field);
    if (hit) identity[field] = hit;
  }

  const variants = {};
  for (const field of variantFields) {
    const hit = readField(row, field);
    if (hit) variants[field] = hit;
  }

  const condition = readField(row, "condition");

  return {
    listingId: asString(row.listingId || row.id) || null,
    source: asString(row.source) || null,
    canonicalProductId: asString(row.canonicalProductId) || null,
    title: asString(row.title) || "",
    imageUrl: asString(row.imageUrl) || "",
    nativeAmount: asString(row.nativeAmount || row.nativePrice || row.price) || "",
    profile: profileInfo.profile || "unknown",
    deferred: profileInfo.deferred,
    unsupported: profileInfo.unsupported,
    eligible: isEligibleListing(row),
    observationShaped: isObservationShaped(row),
    identityFields,
    variantFields,
    identity,
    variants,
    condition: condition ? condition.normalizedValue : null,
    pluginOk: Boolean(resolved.ok),
    pluginReason: resolved.reason,
  };
}

function identityKeyToken(view) {
  if (!view.pluginOk || view.identityFields.length === 0) return null;
  const parts = [`profile=${view.profile}`];
  for (const field of view.identityFields) {
    const hit = view.identity[field];
    if (!hit || !hit.normalizedValue) return null;
    parts.push(`${field}=${hit.normalizedValue}`);
  }
  return parts.join("|");
}

function identityKeyComplete(view) {
  return Boolean(identityKeyToken(view));
}

module.exports = {
  extractListingView,
  pairProfile,
  profilesConflict,
  identityKeyToken,
  identityKeyComplete,
  normalizeFieldValue,
};
